import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  QrCode,
  BookOpen,
  User,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Plus,
  Camera,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Role = "STUDENT" | "TEACHER" | "ADMIN";

interface StudentInfo {
  student_no: string;
  first_name: string;
  last_name: string;
  department?: string;
  grade?: string;
  university?: string;
  faculty?: string;
  email?: string;
}

interface UserInfo {
  id: number;
  username: string;
  role: Role;
  studentInfo?: StudentInfo | null;

  // ✅ Teacher için backend'ten gelirse:
  displayName?: string | null;
}

// --- UI Components ---
const Button = ({ className, variant = "primary", ...props }: any) => {
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
  };
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

const Input = ({ className, label, error, ...props }: any) => (
  <div className="space-y-1 w-full">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      className={cn(
        "w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all",
        error && "border-red-500 focus:ring-red-500",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

const Card = ({ children, className, title, subtitle, action }: any) => (
  <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", className)}>
    {(title || subtitle || action) && (
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const ProfileItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-900">{value || "Belirtilmedi"}</span>
  </div>
);

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium transition-all",
      active ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, color = "indigo" }: any) => {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", colors[color])}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [view, setView] = useState("login"); // login, register, dashboard
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    login: "Giriş Yap",
    register: "Kayıt Ol",
    student: "Öğrenci",
    teacher: "Öğretmen",
    username: "Kullanıcı Adı",
    password: "Şifre",
    studentNo: "Öğrenci No",
    firstName: "Ad",
    lastName: "Soyad",
    university: "Üniversite",
    faculty: "Fakülte",
    department: "Bölüm",
    grade: "Sınıf",
    email: "E-posta",
    dashboard: "Panel",
    courses: "Dersler",
    stats: "Ders Geçmişi",
    profile: "Profil",
    logout: "Çıkış",
    scanQR: "QR Oku",
    pastLessons: "Geçmiş Derslerim",
    recentAttendance: "Son Yoklamalar",
    noData: "Veri bulunamadı",
  };

  // ✅ Ekranda görünecek ad
  const displayName = useMemo(() => {
    if (!user) return "";
    if (user.role === "STUDENT") {
      const fn = user.studentInfo?.first_name || "";
      const ln = user.studentInfo?.last_name || "";
      const full = `${fn} ${ln}`.trim();
      return full || user.username;
    }
    // Teacher/Admin
    return (user.displayName || "").trim() || user.username;
  }, [user]);

  const initials = useMemo(() => {
    const name = displayName || user?.username || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [displayName, user?.username]);

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem("user");
      if (savedUser) setUser(JSON.parse(savedUser));
      setView("dashboard");
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    const role = (e.target as HTMLFormElement).dataset.role;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role }),
      });
      const result = await res.json();

      if (res.ok) {
        setToken(result.token);
        setUser(result.user);
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        setView("dashboard");
      } else {
        setError(result.message || "Giriş başarısız");
      }
    } catch (err) {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch("/api/auth/register-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (res.ok) {
        alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
        setView("login");
      } else {
        setError(result.message || "Kayıt başarısız");
      }
    } catch (err) {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setView("login");
  };

  // --- Views ---
  const LoginView = () => {
    const [loginType, setLoginType] = useState<"STUDENT" | "TEACHER">("STUDENT");

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-2xl mb-4 shadow-lg shadow-indigo-200">
              <QrCode size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">uniQR</h1>
            <p className="text-gray-500">Üniversite Yoklama Sistemi</p>
          </div>

          <Card>
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
              <button
                onClick={() => setLoginType("STUDENT")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  loginType === "STUDENT" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t.student}
              </button>
              <button
                onClick={() => setLoginType("TEACHER")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  loginType === "TEACHER" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t.teacher}
              </button>
            </div>

            <form onSubmit={handleLogin} data-role={loginType} className="space-y-4">
              <Input
                name="username"
                type="password"
                label={loginType === "STUDENT" ? t.studentNo : t.username}
                placeholder={loginType === "TEACHER" ? "Kullanıcı adınızı giriniz." : "220240010"}
                required
              />

              {loginType === "STUDENT" ? (
                <Input name="password" type="password" label={t.password} placeholder="••••••••" required />
              ) : (
                <Input name="tcNo" type="password" label="TC No" placeholder="Tc kimlik numaranızı giriniz." required />
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "..." : t.login}
              </Button>
            </form>

            {loginType === "STUDENT" && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Hesabınız yok mu?{" "}
                  <button onClick={() => setView("register")} className="text-indigo-600 font-semibold hover:underline">
                    {t.register}
                  </button>
                </p>
                <div className="mt-2 text-center">
  <button
    type="button"
    onClick={() =>
      alert("Şifre sıfırlama işlemi için lütfen sistem yöneticisiyle iletişime geçiniz.")
    }
    className="text-sm text-indigo-600 font-semibold hover:underline"
  >
    Şifremi Unuttum?
  </button>
</div>
              </div>
              
            )}
          </Card>
        </motion.div>
      </div>
    );
  };

  const RegisterView = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
        <Card title={t.register} subtitle="Hesap oluşturmak için bilgilerinizi girin">
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
  name="first_name"
  label={t.firstName}
  required
  pattern="^[A-Za-zÇçĞğİıÖöŞşÜü]{2,}$"
  title="Ad en az 2 harf olmalı ve sadece harf içermelidir"
/>

<Input
  name="last_name"
  label={t.lastName}
  required
  pattern="^[A-Za-zÇçĞğİıÖöŞşÜü]{2,}$"
  title="Soyad en az 2 harf olmalı ve sadece harf içermelidir"
/>
<Input name="tc_no" label="TC No" required />
<Input name="student_no" label={t.studentNo} required />
            <Input name="password" label={t.password} type="password" required />
            <Input name="email" label={t.email} type="email" />
            <Input name="university" label={t.university} />
            <Input name="faculty" label={t.faculty} />
            <Input name="department" label={t.department} />
            <Input name="grade" label={t.grade} />

            {error && <div className="md:col-span-2 text-red-500 text-sm">{error}</div>}

            <div className="md:col-span-2 flex gap-3 mt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Kaydediliyor..." : t.register}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setView("login")}>
                İptal
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );

  // --- Dashboard ---
  const DashboardView = () => {
    const [activeTab, setActiveTab] = useState<"dashboard" | "courses" | "stats" | "profile">("dashboard");

    const [stats, setStats] = useState<any[]>([]);
    const [teacherStats, setTeacherStats] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<any>(null);

    const [scanning, setScanning] = useState(false);

    const [showAddCourse, setShowAddCourse] = useState(false);
    const [showCreateSession, setShowCreateSession] = useState<any>(null);
    const [fullScreenQR, setFullScreenQR] = useState(false);

    const [sessionStudents, setSessionStudents] = useState<any[]>([]);
    const [showStudentsModal, setShowStudentsModal] = useState<any>(null);
    const [studentsError, setStudentsError] = useState<string | null>(null);

    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    useEffect(() => {
      const onClick = (e: any) => {
        if (!e.target.closest?.("#profileMenu")) setProfileMenuOpen(false);
      };
      window.addEventListener("click", onClick);
      return () => window.removeEventListener("click", onClick);
    }, []);

    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${token}` };

      try {
        // Profile her role için lazım olabilir
        if (activeTab === "profile") {
          const res = await fetch("/api/user/profile", { headers });
          const data = await res.json();
          setProfile(data);
          return;
        }

        if (user?.role === "STUDENT") {
          // ✅ Student dashboard/courses/stats her yerde stats çekebilir
          const res = await fetch("/api/student/stats", { headers });
          const data = await res.json().catch(() => []);
          setStats(Array.isArray(data) ? data : []);
        } else {
          // Teacher
          if (activeTab === "dashboard" || activeTab === "courses") {
            const res = await fetch("/api/teacher/courses", { headers });
            const data = await res.json().catch(() => []);
            setCourses(Array.isArray(data) ? data : []);
          }
          if (activeTab === "stats") {
            const res = await fetch("/api/teacher/stats", { headers });
            const data = await res.json().catch(() => []);
            setTeacherStats(Array.isArray(data) ? data : []);
          }
        }
      } catch {
        // istersek UI error basarız
      }
    };

    useEffect(() => {
      if (token) fetchData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, token, user?.role]);

    // --- Teacher actions ---
    const handleAddCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData);

      const res = await fetch("/api/teacher/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        // Auto-create a section
        await fetch("/api/teacher/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ courseId: result.id, name: "General" }),
        });
        setShowAddCourse(false);
        fetchData();
      }
    };

    const handleCreateSession = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData);

      const sectionsRes = await fetch(`/api/teacher/courses/${showCreateSession.id}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sections = await sectionsRes.json();
      const sectionId = sections[0]?.id;

      if (!sectionId) {
        alert("Bu ders için şube bulunamadı");
        return;
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const startsAt = `${data.date}T${data.time}:00`;

        const res = await fetch("/api/teacher/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sectionId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            radius: 100,
            durationMinutes: parseInt(data.duration as string),
            startsAt,
          }),
        });

        const result = await res.json();
        if (res.ok) {
          setActiveSession(result);
          setShowCreateSession(null);
          setActiveTab("dashboard");
        } else {
          alert(result.message || "Oturum oluşturulamadı");
        }
      });
    };

    const handleDeleteCourse = async (id: number) => {
      if (!confirm("Bu dersi silmek istediğinizden emin misiniz?")) return;
      const res = await fetch(`/api/teacher/courses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchData();
    };

    const handleCloseSession = async () => {
      if (!activeSession) return;
      const res = await fetch(`/api/teacher/sessions/${activeSession.id}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveSession(null);
        setFullScreenQR(false);
      }
    };

    const fetchSessionStudents = async (session: any) => {
      try {
        setStudentsError(null);
        const sessionId = session?.session_id ?? session?.id; // ✅ ikisi de olur
        if (!sessionId) {
          setStudentsError("Session ID bulunamadı.");
          setSessionStudents([]);
          setShowStudentsModal(session);
          return;
        }

        const res = await fetch(`/api/teacher/sessions/${sessionId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setStudentsError(data?.message || "Öğrenci listesi alınamadı.");
          setSessionStudents([]);
          setShowStudentsModal(session);
          return;
        }

        setSessionStudents(Array.isArray(data) ? data : []);
        setShowStudentsModal(session);
      } catch {
        setStudentsError("Bağlantı hatası / Sunucu yanıt vermedi.");
        setSessionStudents([]);
        setShowStudentsModal(session);
      }
    };

    // --- Student scan ---
    const handleScan = async (decodedText: string) => {
      if (!decodedText) return;

      setScanning(false);
      setLoading(true);

      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch("/api/student/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              sessionToken: decodedText,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });

          const result = await res.json();
          if (res.ok) {
            alert(result.message || `Durum: ${result.status}`);
            fetchData();
          } else {
            alert(result.message || "Giriş başarısız");
          }
        } catch {
          alert("Giriş başarısız");
        } finally {
          setLoading(false);
        }
      });
    };

   useEffect(() => {
  let scanner: any = null;

  if (scanning) {
    const startScanner = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");

      scanner = new Html5Qrcode("reader");

      try {
        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText: string) => {
            handleScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.log(err);
      }
    };

    startScanner();
  }

  return () => {
    if (scanner) {
      scanner.stop().catch(() => {});
      scanner.clear().catch(() => {});
    }
  };
}, [scanning]);

    // Student derived data
    const uniqueCourses = useMemo(() => {
      const set = new Set<string>();
      (stats || []).forEach((s: any) => {
        if (s?.course_name) set.add(String(s.course_name));
      });
      return Array.from(set);
    }, [stats]);

    const attendanceOkCount = useMemo(() => {
      return (stats || []).filter((s: any) => s.status === "OK" || s.status === "EXITED").length;
    }, [stats]);

    const fakeAbsence = 0;
    const attendancePercent = useMemo(() => {
      const denom = (stats?.length || 0) + fakeAbsence;
      if (denom <= 0) return 0;
      return Math.round((attendanceOkCount / denom) * 100);
    }, [attendanceOkCount, stats?.length]);

    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col">
          <div className="p-6">
            <div className="flex items-center gap-3 text-indigo-600 mb-8">
              <QrCode size={28} />
              <span className="text-xl font-bold text-gray-900">uniQR</span>
            </div>
            <nav className="space-y-1">
              <NavItem icon={<LayoutDashboard size={20} />} label={t.dashboard} active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
              <NavItem icon={<BookOpen size={20} />} label={t.courses} active={activeTab === "courses"} onClick={() => setActiveTab("courses")} />
              <NavItem icon={<BarChart3 size={20} />} label={user?.role === "STUDENT" ? t.stats : "İstatistikler"} active={activeTab === "stats"} onClick={() => setActiveTab("stats")} />
              <NavItem icon={<User size={20} />} label={t.profile} active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tekrar hoş geldin, {displayName}</h2>
              <p className="text-gray-500">İşte bugün olanlar</p>
            </div>

            {/* Profile menu */}
            <div id="profileMenu" className="relative">
              <button
                onClick={() => setProfileMenuOpen((s) => !s)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition"
              >
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                  {initials}
                </div>
                <ChevronDown className={cn("text-gray-400 transition-transform", profileMenuOpen && "rotate-180")} size={18} />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden z-20"
                  >
                    <button
                      onClick={() => {
                        setActiveTab("dashboard");
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                    >
                      <LayoutDashboard size={18} className="text-gray-500" />
                      <div>
                        <p className="font-semibold text-gray-900">Panele Dön</p>
                        <p className="text-xs text-gray-500">Öğrenci paneline geri dön</p>
                      </div>
                    </button>

                    <div className="h-px bg-gray-100" />

                    <button
                      onClick={() => {
                        setActiveTab("profile");
                        setProfileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                    >
                      <User size={18} className="text-gray-500" />
                      <div>
                        <p className="font-semibold text-gray-900">Profil</p>
                        <p className="text-xs text-gray-500">{user?.role === "STUDENT" ? "Öğrenci" : "Öğretmen"}</p>
                      </div>
                    </button>

                    <div className="h-px bg-gray-100" />

                    <button
                      onClick={logout}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-left"
                    >
                      <LogOut size={18} className="text-red-500" />
                      <p className="font-semibold text-red-600">Çıkış Yap</p>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          {/* STUDENT */}
          {user?.role === "STUDENT" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dashboard */}
              {activeTab === "dashboard" && (
                <>
                  <div className="lg:col-span-2 space-y-6">
                    <Card title={t.scanQR} subtitle="Öğretmeniniz tarafından gösterilen QR kodunu okutun">
                      <div className="flex flex-col items-center justify-center py-8">
                        {scanning ? (
                          <div className="w-full max-w-sm space-y-4">
                            <div id="reader" className="w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200" />
                            <Button variant="danger" className="w-full" onClick={() => setScanning(false)}>
                              İptal
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Camera size={40} />
                            </div>
                            <p className="text-gray-500 mb-6">Yoklama için hazır mısınız? Taramak için kameranızı açın.</p>
                            <Button onClick={() => setScanning(true)} className="px-8">
                              <Camera size={20} /> {t.scanQR}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card title={t.recentAttendance}>
                      <div className="space-y-4">
                        {(stats || []).length > 0 ? (
                          stats.slice(0, 5).map((record: any) => (
                            <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    record.status === "OK"
                                      ? "bg-green-100 text-green-600"
                                      : record.status === "EXITED"
                                      ? "bg-orange-100 text-orange-600"
                                      : "bg-red-100 text-red-600"
                                  )}
                                >
                                  {record.status === "OK" ? (
                                    <CheckCircle size={20} />
                                  ) : record.status === "EXITED" ? (
                                    <LogOut size={20} />
                                  ) : (
                                    <XCircle size={20} />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{record.course_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {record.status === "EXITED"
                                      ? `Çıkış: ${record.check_out_at ? format(new Date(record.check_out_at), "p") : "-"}`
                                      : `Giriş: ${record.check_in_at ? format(new Date(record.check_in_at), "p") : "-"}`}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded-md text-xs font-bold",
                                    record.status === "OK"
                                      ? "bg-green-100 text-green-700"
                                      : record.status === "EXITED"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-red-100 text-red-700"
                                  )}
                                >
                                  {record.status === "OK" ? "AKTİF" : record.status}
                                </span>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {record.distance != null ? `${Math.round(record.distance)}m` : "-"}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 py-8">{t.noData}</p>
                        )}
                      </div>
                    </Card>


                    <Card
                      title="Katıldığım Geçmiş Dersler"
                      subtitle="Daha önce yoklamasına katıldığınız dersler"
                      action={
                        <Button variant="ghost" onClick={() => setActiveTab("courses")}>
                          Tümünü Gör
                        </Button>
                      }
                    >
                      <div className="space-y-3">
                        {uniqueCourses.length > 0 ? (
                          uniqueCourses.slice(0, 4).map((courseName: string) => {
                            const courseRecords = (stats || []).filter((s: any) => s.course_name === courseName);
                            const lastRecord = courseRecords[0];
                            return (
                              <div key={courseName} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-4">
                                  <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                                    {courseName.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{courseName}</p>
                                    <p className="text-xs text-gray-500">{courseRecords.length} yoklama kaydı</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700">
                                    Katıldı
                                  </span>
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    {lastRecord?.check_in_at ? format(new Date(lastRecord.check_in_at), "dd.MM.yyyy") : "-"}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center">
                            <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">Henüz katıldığınız ders bulunmuyor.</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card title="Katılım Oranı">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Mevcut", value: attendanceOkCount },
                                { name: "Devamsızlık durumu"},
                              ]}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#4f46e5" />
                              <Cell fill="#f3f4f6" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="text-center -mt-36 mb-24">
                          <p className="text-3xl font-bold text-gray-900">{attendancePercent}%</p>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Genel</p>
                        </div>
                      </div>
                    </Card>

                    <Card title="Profil Özeti">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Öğrenci No</span>
                          <span className="font-medium">{user?.studentInfo?.student_no || "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Bölüm</span>
                          <span className="font-medium">{user?.studentInfo?.department || "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Sınıf</span>
                          <span className="font-medium">{user?.studentInfo?.grade || "-"}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              )}

              {/* Courses */}
              {activeTab === "courses" && (
                <div className="lg:col-span-3 space-y-6">
                  <h3 className="text-xl font-bold text-gray-900">Katıldığım Dersler</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {uniqueCourses.length > 0 ? (
                      uniqueCourses.map((courseName: string) => {
                        const courseRecords = (stats || []).filter((s: any) => s.course_name === courseName);
                        return (
                          <Card key={courseName} className="hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                                {courseName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">{courseName}</h4>
                                <p className="text-xs text-gray-500">{courseRecords.length} oturum</p>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                        <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Henüz herhangi bir derse katılmadınız.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              {activeTab === "stats" && (
                <div className="lg:col-span-3">
                  <Card title={t.pastLessons}>
                    <div className="space-y-6">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={(stats || []).slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="course_name" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                            <Bar dataKey="distance" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Mesafe (m)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                              <th className="pb-3 font-medium">Ders</th>
                              <th className="pb-3 font-medium">Tarih</th>
                              <th className="pb-3 font-medium">Durum</th>
                              <th className="pb-3 font-medium">Mesafe</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {(stats || []).map((record: any) => (
                              <tr key={record.id} className="text-sm">
                                <td className="py-4 font-medium text-gray-900">{record.course_name}</td>
                                <td className="py-4 text-gray-500">
                                  {record.check_in_at ? format(new Date(record.check_in_at), "PPP p") : "-"}
                                </td>
                                <td className="py-4">
                                  <span
                                    className={cn(
                                      "px-2 py-1 rounded-md text-xs font-bold",
                                      record.status === "OK"
                                        ? "bg-green-100 text-green-700"
                                        : record.status === "EXITED"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-red-100 text-red-700"
                                    )}
                                  >
                                    {record.status}
                                  </span>
                                </td>
                                <td className="py-4 text-gray-500">{record.distance != null ? `${Math.round(record.distance)}m` : "-"}</td>
                              </tr>
                            ))}

                            {(stats || []).length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-400">
                                  Veri bulunamadı.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Profile */}
              {activeTab === "profile" && (
                <div className="lg:col-span-3">
                  <Card title="Öğrenci Profili">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-bold">
                            {initials}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">{displayName}</h3>
                            <p className="text-gray-500">{user?.role === "STUDENT" ? "Öğrenci" : user?.role}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Öğrenci No</p>
                            <p className="font-semibold text-gray-900">{user?.studentInfo?.student_no || "-"}</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-2xl">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Sınıf</p>
                            <p className="font-semibold text-gray-900">{user?.studentInfo?.grade || "-"}</p>
                          </div>
                        </div>

                        <Button variant="secondary" className="w-full" onClick={() => setActiveTab("dashboard")}>
                          <LayoutDashboard size={18} /> Ana Sayfa
                        </Button>

                        <Button variant="secondary" className="w-full" onClick={() => setActiveTab("courses")}>
                          <BookOpen size={18} /> Katıldığım Dersler
                        </Button>

                        <Button variant="danger" className="w-full" onClick={logout}>
                          <LogOut size={18} /> {t.logout}
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Akademik Bilgiler</h4>
                        <div className="space-y-3">
                          <ProfileItem label="Üniversite" value={user?.studentInfo?.university || ""} />
                          <ProfileItem label="Fakülte" value={user?.studentInfo?.faculty || ""} />
                          <ProfileItem label="Bölüm" value={user?.studentInfo?.department || ""} />
                          <ProfileItem label="E-posta" value={user?.studentInfo?.email || ""} />
                          <ProfileItem label="Üyelik" value={profile?.created_at ? format(new Date(profile.created_at), "PPP") : ""} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            // --- TEACHER ---
            <div className="space-y-6">
              {/* Teacher Dashboard */}
              {activeTab === "dashboard" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Toplam Ders" value={courses.length} icon={<BookOpen />} />
                    <StatCard title="Aktif Oturumlar" value={activeSession ? 1 : 0} icon={<Clock />} color="green" />
                    <StatCard title="Toplam Öğrenci" value="33" icon={<User />} color="indigo" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Hızlı İşlemler">
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setActiveTab("courses")}
                          className="p-6 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all text-left group"
                        >
                          <BookOpen className="mb-4 group-hover:scale-110 transition-transform" />
                          <p className="font-bold">Dersleri Yönet</p>
                          <p className="text-xs opacity-70">Sınıflarınızı ekleyin veya düzenleyin</p>
                        </button>

                        <button
                          onClick={() => setActiveTab("courses")}
                          className="p-6 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all text-left group"
                        >
                          <QrCode className="mb-4 group-hover:scale-110 transition-transform" />
                          <p className="font-bold">Yoklama Başlat</p>
                          <p className="text-xs opacity-70">Bir sınıf için QR oluştur</p>
                        </button>
                      </div>
                    </Card>

                    {activeSession ? (
                      <Card title="Canlı Yoklama Oturumu" subtitle="Öğrenciler giriş yapmak için bu kodu tarayabilir">
                        <div className="flex flex-col items-center justify-center py-4">
                          <div
                            className="p-4 bg-white rounded-2xl shadow-xl border border-gray-100 mb-6 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setFullScreenQR(true)}
                          >
                            <QRCodeSVG value={activeSession.token} size={300} />
                          </div>

                          <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Oturum Belgesi</p>
                            <p className="text-2xl font-mono font-bold text-indigo-600">{String(activeSession.token).substring(0, 8)}</p>
                            <div className="flex items-center gap-2 text-red-500 font-medium justify-center">
                              <Clock size={16} />
                              <span>Sona erme saati: {activeSession.endsAt ? format(new Date(activeSession.endsAt), "p") : "-"}</span>
                            </div>
                          </div>

                          <div className="flex gap-3 mt-8 w-full">
                            <Button className="flex-1" onClick={() => setFullScreenQR(true)}>
                              Tam Ekran
                            </Button>
                            <Button variant="danger" className="flex-1" onClick={handleCloseSession}>
                              Oturumu Bitir
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card title="Katılım Trendleri">
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: "W1", val: 85 },
                                { name: "W2", val: 78 },
                                { name: "W3", val: 92 },
                                { name: "W4", val: 88 },
                                { name: "W5", val: 95 },
                              ]}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                              <Tooltip
                                cursor={{ fill: "#f9fafb" }}
                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                              />
                              <Bar dataKey="val" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Teacher Courses */}
              {activeTab === "courses" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">Dersleriniz</h3>
                    <Button onClick={() => setShowAddCourse(true)}>
                      <Plus size={18} /> Ders Ekle
                    </Button>
                  </div>

                  {showAddCourse && (
                    <Card title="Yeni Ders Ekle">
                      <form onSubmit={handleAddCourse} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input name="code" label="Ders Kodu" placeholder="örneğin CS101" required />
                          <Input name="name" label="Ders Adı" placeholder="örneğin Bilgisayar Bilimine Giriş" required />
                          <Input name="className" label="Sınıf / Oda" placeholder="örneğin Oda 302" required />
                        </div>
                        <div className="flex gap-3">
                          <Button type="submit">Ders Oluştur</Button>
                          <Button type="button" variant="secondary" onClick={() => setShowAddCourse(false)}>
                            İptal
                          </Button>
                        </div>
                      </form>
                    </Card>
                  )}

                  {showCreateSession && (
                    <Card title={`QR Oluştur: ${showCreateSession.name}`} subtitle="Bu oturum için tarih ve saati ayarlayın">
                      <form onSubmit={handleCreateSession} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input name="date" type="date" label="Tarih" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
                          <Input name="time" type="time" label="Başlangıç Saati" defaultValue={format(new Date(), "HH:mm")} required />
                          <Input name="duration" type="number" label="Süre (dakika)" defaultValue="15" required />
                        </div>
                        <div className="flex gap-3">
                          <Button type="submit">QR Oluştur</Button>
                          <Button type="button" variant="secondary" onClick={() => setShowCreateSession(null)}>
                            İptal
                          </Button>
                        </div>
                      </form>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courses.length > 0 ? (
                      courses.map((course: any) => (
                        <Card key={course.id} className="hover:border-indigo-200 transition-all group relative">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setShowCreateSession(course)}>
                              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                                {course.code}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">{course.name}</h4>
                                <p className="text-sm text-gray-500">{course.class_name || "Sınıf ayarlanmadı"}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                className="text-red-500 hover:bg-red-50"
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  handleDeleteCourse(course.id);
                                }}
                              >
                                <X size={18} />
                              </Button>

                              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <QrCode size={20} />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="md:col-span-2 py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                        <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Henüz ders eklemediniz.</p>
                        <Button variant="ghost" className="mt-2" onClick={() => setShowAddCourse(true)}>
                          İlk dersinizi ekleyin
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Teacher Stats */}
              {activeTab === "stats" && (
                <div className="space-y-6">
                  <Card title="Oturum Başına Katılım İstatistikleri">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teacherStats}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis
                            dataKey="starts_at"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 10 }}
                            tickFormatter={(val) => (val ? format(new Date(val), "MMM d") : "")}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                            labelFormatter={(val) => (val ? format(new Date(val as any), "PPP p") : "")}
                          />
                          <Bar dataKey="attendance_count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Mevcut Öğrenciler" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="Oturum Geçmişi">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                            <th className="pb-3 font-medium">Ders</th>
                            <th className="pb-3 font-medium">Tarih ve Saat</th>
                            <th className="pb-3 font-medium text-center">Katılım</th>
                            <th className="pb-3 font-medium text-right">İşlem</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-50">
                          {teacherStats.map((session: any) => (
                            <tr key={session.session_id ?? session.id} className="text-sm">
                              <td className="py-4">
                                <p className="font-bold text-gray-900">{session.course_name}</p>
                                <p className="text-xs text-gray-500">{session.course_code}</p>
                              </td>
                              <td className="py-4 text-gray-500">{session.starts_at ? format(new Date(session.starts_at), "PPP p") : "-"}</td>
                              <td className="py-4 text-center">
                                <span className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full font-bold">
                                  {session.attendance_count}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <Button variant="ghost" className="text-indigo-600" onClick={() => fetchSessionStudents(session)}>
                                  Öğrencileri Görüntüle
                                </Button>
                              </td>
                            </tr>
                          ))}

                          {teacherStats.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-gray-400">
                                Veri bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* Teacher Profile */}
              {activeTab === "profile" && (
                <Card title="Öğretmen Profili">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-bold">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{displayName}</h3>
                          <p className="text-gray-500">Eğitmen / Öğretmen</p>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-2xl">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">TC Kimlik No</p>
                        <p className="font-semibold text-gray-900">{profile?.tc_no || "-"}</p>
                      </div>

                      <Button variant="danger" className="w-full" onClick={logout}>
                        <LogOut size={18} /> {t.logout}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Hesap Detayları</h4>
                      <div className="space-y-3">
                        <ProfileItem label="Ad Soyad" value={displayName} />
                        <ProfileItem label="Rol" value="Öğretmen" />
                        <ProfileItem label="Üyelik Tarihi" value={profile?.created_at ? format(new Date(profile.created_at), "PPP") : ""} />
                        <ProfileItem label="Sistem ID" value={profile?.id ? `#${String(profile.id).padStart(4, "0")}` : ""} />
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Students Modal */}
          <AnimatePresence>
            {showStudentsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                >
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                    <div>
                      <h3 className="text-xl font-bold">{showStudentsModal.course_name || "Oturum"}</h3>
                      <p className="text-indigo-100 text-sm">
                        {showStudentsModal.starts_at ? format(new Date(showStudentsModal.starts_at), "PPP p") : ""}
                      </p>
                    </div>
                    <button onClick={() => setShowStudentsModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {studentsError && (
                      <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{studentsError}</div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                            <th className="pb-3 font-medium">Öğrenci No</th>
                            <th className="pb-3 font-medium">Ad Soyad</th>
                            <th className="pb-3 font-medium">Giriş</th>
                            <th className="pb-3 font-medium">Durum</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-50">
                          {sessionStudents.length > 0 ? (
                            sessionStudents.map((student: any) => (
                              <tr key={student.student_no} className="text-sm">
                                <td className="py-4 font-mono text-gray-500">{student.student_no}</td>
                                <td className="py-4 font-bold text-gray-900">
                                  {student.first_name} {student.last_name}
                                </td>
                                <td className="py-4 text-gray-500">
                                  {student.check_in_at ? format(new Date(student.check_in_at), "p") : "-"}
                                </td>
                                <td className="py-4">
                                  <span
                                    className={cn(
                                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                      student.status === "OK" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                                    )}
                                  >
                                    {student.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-gray-400">
                                Bu oturuma katılan öğrenci bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <Button onClick={() => setShowStudentsModal(null)}>Kapat</Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Full Screen QR */}
          <AnimatePresence>
            {fullScreenQR && activeSession && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8"
              >
                <button
                  onClick={() => setFullScreenQR(false)}
                  className="absolute top-8 right-8 p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={32} />
                </button>

                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Giriş / Çıkış için Tarayın</h2>
                  <p className="text-xl text-gray-500">uniQR Yoklama Sistemi</p>
                </div>

                <div className="p-12 bg-white rounded-[3rem] shadow-2xl border border-gray-100 mb-12">
                  <QRCodeSVG value={activeSession.token} size={450} />
                </div>

                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-2xl">
                    <Clock size={28} />
                    <span>Sona erme saati: {activeSession.endsAt ? format(new Date(activeSession.endsAt), "p") : "-"}</span>
                  </div>
                  <p className="text-gray-400 font-mono text-lg">Belge: {String(activeSession.token).substring(0, 8)}</p>
                </div>

                <Button variant="danger" className="mt-12 px-12 h-14 text-lg" onClick={handleCloseSession}>
                  Oturumu Bitir
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
        </main>
      </div>
    );
  };

  return (
    <div className="font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      <AnimatePresence mode="wait">
        {view === "login" && <LoginView key="login" />}
        {view === "register" && <RegisterView key="register" />}
        {view === "dashboard" && <DashboardView key="dashboard" />}
      </AnimatePresence>
    </div>
  );
}