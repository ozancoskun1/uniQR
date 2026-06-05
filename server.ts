import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("uniatteand.db");
const JWT_SECRET = process.env.JWT_SECRET || "uniatteand_secret_key_2024_secure";

/** Helper: check sqlite table exists */
const tableExists = (name: string) => {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
  return !!row;
};


db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    tc_no TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL CHECK(role IN ('STUDENT', 'TEACHER', 'ADMIN')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    student_no TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    university TEXT,
    faculty TEXT,
    department TEXT,
    grade TEXT,
    email TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    class_name TEXT,
    teacher_id INTEGER NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius INTEGER NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    check_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    check_out_at DATETIME,
    lat REAL,
    lng REAL,
    distance REAL,
    status TEXT NOT NULL CHECK(status IN ('OK', 'LATE', 'REJECTED', 'PENDING', 'EXITED')),
    device_info TEXT,
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(session_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS excuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    description TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'PENDING',
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    note TEXT,
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

/** 2) Safe migrations */
try {
  if (tableExists("users")) {
    const cols = db.prepare("PRAGMA table_info(users)").all() as any[];

    if (!cols.some((c) => c.name === "tc_no")) db.exec("ALTER TABLE users ADD COLUMN tc_no TEXT");
    if (!cols.some((c) => c.name === "first_name")) db.exec("ALTER TABLE users ADD COLUMN first_name TEXT");
    if (!cols.some((c) => c.name === "last_name")) db.exec("ALTER TABLE users ADD COLUMN last_name TEXT");
  }

  if (tableExists("courses")) {
    const cols = db.prepare("PRAGMA table_info(courses)").all() as any[];
    if (!cols.some((c) => c.name === "class_name")) db.exec("ALTER TABLE courses ADD COLUMN class_name TEXT");
  }

  if (tableExists("attendance_records")) {
    const cols = db.prepare("PRAGMA table_info(attendance_records)").all() as any[];
    if (!cols.some((c) => c.name === "check_out_at")) db.exec("ALTER TABLE attendance_records ADD COLUMN check_out_at DATETIME");
  }
} catch (e) {
  console.error("Migration error:", e);
}

/** Helper: displayName */
const buildDisplayName = (first?: string, last?: string) => {
  const fn = (first || "").trim();
  const ln = (last || "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || null;
};

/** 3) Seed Fixed Teacher */
const seedTeacher = () => {
  const teacherUsername = "ozancoskunufuk";
  const teacherTC = "13591075012";
  const teacherFirst = "Ozan";
  const teacherLast = "Çoşkun";

  const existing: any = db.prepare("SELECT * FROM users WHERE username = ?").get(teacherUsername);

  if (!existing) {
    const dummyHash = bcrypt.hashSync("ozancoskun", 10);
    db.prepare(
      "INSERT INTO users (username, tc_no, role, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(teacherUsername, teacherTC, "TEACHER", dummyHash, teacherFirst, teacherLast);

    console.log("Fixed teacher seeded:", teacherUsername);
  } else {
    if (!existing.tc_no) db.prepare("UPDATE users SET tc_no = ? WHERE username = ?").run(teacherTC, teacherUsername);
    if (!existing.first_name || !existing.last_name) {
      db.prepare("UPDATE users SET first_name = ?, last_name = ? WHERE username = ?")
        .run(teacherFirst, teacherLast, teacherUsername);
    }
  }
};
seedTeacher();

// --- Express App Setup ---
async function startServer() {
  const app = express();
  app.use(express.json());

  // --- Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const logAudit = (userId: number | null, action: string, details: string, req: any) => {
    db.prepare(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, action, details, req.ip, req.get("User-Agent"));
  };

  // --- Auth Endpoints ---
  app.post("/api/auth/login", (req, res) => {
    const { username, password, tcNo, role } = req.body;

    let user: any;

    if (role === "TEACHER") {
      user = db.prepare("SELECT * FROM users WHERE username = ? AND role = 'TEACHER'").get(username);

      if (!user || user.tc_no !== tcNo) {
        logAudit(null, "LOGIN_FAILED_TEACHER", `Username: ${username}`, req);
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } else {
      user = db.prepare("SELECT * FROM users WHERE username = ? AND role = 'STUDENT'").get(username);

      if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
        logAudit(null, "LOGIN_FAILED_STUDENT", `StudentNo: ${username}`, req);
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // ✅ öğrenci bilgisi + displayName
    let studentInfo = null;
    let displayName: string | null = null;

    if (user.role === "STUDENT") {
      studentInfo = db.prepare("SELECT * FROM students WHERE user_id = ?").get(user.id);
      displayName = buildDisplayName(studentInfo?.first_name, studentInfo?.last_name);
    } else {
      displayName = buildDisplayName(user.first_name, user.last_name);
    }

    logAudit(user.id, "LOGIN_SUCCESS", "", req);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        studentInfo,
        displayName, // ✅ eklendi
      },
    });
  });

  app.post("/api/auth/register-student", (req, res) => {
    const { studentNo, firstName, lastName, tcNo, password, email, university, faculty, department, grade } = req.body;

    const existingStudent = db.prepare("SELECT * FROM students WHERE student_no = ?").get(studentNo);
    if (existingStudent) return res.status(400).json({ message: "Student number already registered" });

    const existingTC = db.prepare("SELECT * FROM users WHERE tc_no = ?").get(tcNo);
    if (existingTC) return res.status(400).json({ message: "TC number already registered" });

    try {
      const dbTransaction = db.transaction(() => {
        const hash = bcrypt.hashSync(password, 10);
        const userResult = db
          .prepare("INSERT INTO users (username, tc_no, password_hash, role) VALUES (?, ?, ?, ?)")
          .run(studentNo, tcNo, hash, "STUDENT");

        const userId = userResult.lastInsertRowid;

        db.prepare(`
          INSERT INTO students (user_id, student_no, first_name, last_name, university, faculty, department, grade, email)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          studentNo,
          firstName,
          lastName,
          university || "",
          faculty || "",
          department || "",
          grade || "",
          email || ""
        );

        return userId;
      });

      const userId = dbTransaction();
      logAudit(Number(userId), "STUDENT_REGISTER", `StudentNo: ${studentNo}`, req);
      res.status(201).json({ message: "Student registered successfully", studentNo });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/complete-profile", (req, res) => {
    const { studentNo, username, password } = req.body;

    const user: any = db.prepare("SELECT * FROM users WHERE username = ? AND role = 'STUDENT'").get(studentNo);
    if (!user) return res.status(404).json({ message: "Student not found" });

    try {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE users SET username = ?, password_hash = ? WHERE id = ?").run(username, hash, user.id);

      logAudit(user.id, "PROFILE_COMPLETE", `New Username: ${username}`, req);
      res.json({ message: "Profile completed successfully" });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ message: "Username already taken" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // --- Teacher Endpoints ---
  app.get("/api/teacher/courses", authenticateToken, (req: any, res) => {
    if (req.user.role !== "TEACHER") return res.sendStatus(403);
    const courses = db.prepare("SELECT * FROM courses WHERE teacher_id = ?").all(req.user.id);
    res.json(courses);
  });

  app.post("/api/teacher/courses", authenticateToken, (req: any, res) => {
    if (req.user.role !== "TEACHER") return res.sendStatus(403);
    const { code, name, className } = req.body;
    const result = db
      .prepare("INSERT INTO courses (code, name, class_name, teacher_id) VALUES (?, ?, ?, ?)")
      .run(code, name, className, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.delete("/api/teacher/courses/:id", authenticateToken, (req: any, res) => {
    if (req.user.role !== "TEACHER") return res.sendStatus(403);
    db.prepare("DELETE FROM courses WHERE id = ? AND teacher_id = ?").run(req.params.id, req.user.id);
    res.sendStatus(204);
  });

  app.get("/api/teacher/courses/:courseId/sections", authenticateToken, (req: any, res) => {
    const sections = db.prepare("SELECT * FROM sections WHERE course_id = ?").all(req.params.courseId);
    res.json(sections);
  });

  app.post("/api/teacher/sections", authenticateToken, (req: any, res) => {
    const { courseId, name } = req.body;
    const result = db.prepare("INSERT INTO sections (course_id, name) VALUES (?, ?)").run(courseId, name);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  app.post("/api/teacher/sessions", authenticateToken, (req: any, res) => {
    const { sectionId, lat, lng, radius, durationMinutes, startsAt: customStartsAt } = req.body;
    const token =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const startsAt = customStartsAt ? new Date(customStartsAt).toISOString() : new Date().toISOString();
    const endsAt = new Date(new Date(startsAt).getTime() + (durationMinutes || 15) * 60000).toISOString();

    const result = db.prepare(`
      INSERT INTO attendance_sessions (section_id, token, lat, lng, radius, starts_at, ends_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sectionId, token, lat, lng, radius, startsAt, endsAt);

    res.status(201).json({ id: result.lastInsertRowid, token, startsAt, endsAt });
  });

  app.post("/api/teacher/sessions/:id/close", authenticateToken, (req: any, res) => {
    if (req.user.role !== "TEACHER") return res.sendStatus(403);
    db.prepare("UPDATE attendance_sessions SET status = 'CLOSED' WHERE id = ?").run(req.params.id);
    res.json({ message: "Session closed" });
  });

  // --- Student Endpoints ---
  app.post("/api/student/check-in", authenticateToken, (req: any, res) => {
    if (req.user.role !== "STUDENT") return res.sendStatus(403);
    const { sessionToken, lat, lng } = req.body;

    const session: any = db
      .prepare("SELECT * FROM attendance_sessions WHERE token = ? AND status = 'ACTIVE'")
      .get(sessionToken);
    if (!session) return res.status(404).json({ message: "Session not found or inactive" });

    const now = new Date();
    if (now > new Date(session.ends_at)) return res.status(400).json({ message: "Session has expired" });

    const student: any = db.prepare("SELECT id FROM students WHERE user_id = ?").get(req.user.id);

    const existing: any = db
      .prepare("SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?")
      .get(session.id, student.id);

    if (existing) {
      if (existing.check_out_at) return res.status(400).json({ message: "Already checked out" });

      db.prepare("UPDATE attendance_records SET check_out_at = CURRENT_TIMESTAMP, status = 'EXITED' WHERE id = ?")
        .run(existing.id);

      return res.json({ status: "EXITED", message: "Checked out successfully" });
    }

    // Haversine distance
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371e3;
    const dLat = toRad(lat - session.lat);
    const dLng = toRad(lng - session.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(session.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    let status = "OK";
    if (distance > session.radius) status = "REJECTED";

    db.prepare(`
      INSERT INTO attendance_records (session_id, student_id, lat, lng, distance, status, device_info)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(session.id, student.id, lat, lng, distance, status, req.get("User-Agent"));

    res.json({ status, distance, message: "Checked in successfully" });
  });

  app.get("/api/student/stats", authenticateToken, (req: any, res) => {
    const student: any = db.prepare("SELECT id FROM students WHERE user_id = ?").get(req.user.id);
    const records = db.prepare(`
      SELECT r.*, s.starts_at, c.name as course_name
      FROM attendance_records r
      JOIN attendance_sessions s ON r.session_id = s.id
      JOIN sections sec ON s.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE r.student_id = ?
      ORDER BY r.check_in_at DESC
    `).all(student.id);
    res.json(records);
  });

  app.get("/api/teacher/stats", authenticateToken, (req: any, res) => {
    if (req.user.role !== "TEACHER") return res.sendStatus(403);

    const stats = db.prepare(`
      SELECT
        c.id as course_id,
        c.name as course_name,
        c.code as course_code,
        s.id as session_id,
        s.starts_at,
        COUNT(r.id) as attendance_count
      FROM courses c
      JOIN sections sec ON c.id = sec.course_id
      JOIN attendance_sessions s ON sec.id = s.section_id
      LEFT JOIN attendance_records r ON s.id = r.session_id AND r.status IN ('OK', 'LATE', 'EXITED')
      WHERE c.teacher_id = ?
      GROUP BY s.id
      ORDER BY s.starts_at DESC
    `).all(req.user.id);

    res.json(stats);
  });

  app.get("/api/teacher/sessions/:sessionId/students", authenticateToken, (req: any, res) => {
    if (req.user.role !== "TEACHER") return res.sendStatus(403);
    const { sessionId } = req.params;

    const sessionOwner: any = db.prepare(`
      SELECT c.teacher_id
      FROM attendance_sessions s
      JOIN sections sec ON s.section_id = sec.id
      JOIN courses c ON sec.course_id = c.id
      WHERE s.id = ?
    `).get(sessionId);

    if (!sessionOwner || sessionOwner.teacher_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this session" });
    }

    const students = db.prepare(`
      SELECT
        s.first_name,
        s.last_name,
        s.student_no,
        r.check_in_at,
        r.status,
        r.distance
      FROM attendance_records r
      JOIN students s ON r.student_id = s.id
      WHERE r.session_id = ?
      ORDER BY s.first_name ASC
    `).all(sessionId);

    res.json(students);
  });

  // ✅ profile endpoint: displayName döndür
  app.get("/api/user/profile", authenticateToken, (req: any, res) => {
    const u: any = db
      .prepare("SELECT id, username, tc_no, role, created_at, first_name, last_name FROM users WHERE id = ?")
      .get(req.user.id);

    if (!u) return res.status(404).json({ message: "User not found" });

    let profileData: any = { ...u };
    if (u.role === "STUDENT") {
      const studentInfo = db.prepare("SELECT * FROM students WHERE user_id = ?").get(u.id);
      profileData.studentInfo = studentInfo;
      profileData.displayName = buildDisplayName(studentInfo?.first_name, studentInfo?.last_name);
    } else {
      profileData.displayName = buildDisplayName(u.first_name, u.last_name);
    }

    res.json(profileData);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();