# UniAttend - QR & Location Verified Attendance System

UniAttend is a production-grade university attendance system featuring QR code verification and geolocation validation to prevent fraud.

## 🚀 Features

- **Dual-Role System**: Dedicated dashboards for Students and Teachers.
- **Secure Authentication**: JWT-based auth with role-based access control.
- **Fixed Teacher Access**: Pre-seeded teacher account for security.
- **Fraud Prevention**: 
  - QR codes with session-specific tokens.
  - Geolocation verification (Haversine distance calculation).
  - Duplicate check-in prevention.
- **Student Registration**: Unique student number validation.
- **Analytics**: Visual attendance trends using Recharts.
- **Audit Logging**: Comprehensive logs for all critical actions.
- **Multi-language**: Support for Turkish and English.

## 🔑 Credentials

### Teacher (Fixed)
- **Username**: `ozancoskunufuk`
- **Password**: `ozancoskun`

### Student
- Register via the UI with a unique student number.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
- **Backend**: Node.js (Express), TypeScript, JWT, Bcrypt.
- **Database**: SQLite (via `better-sqlite3`) for robust local storage.
- **AI**: Gemini 2.5 Flash for potential future insights.

## 📦 Installation & Setup

1. The app is pre-configured for the AI Studio environment.
2. Run `npm run dev` to start the full-stack server.
3. Access the app at port 3000.

## 🗺 ERD (Simplified)

- **Users**: Auth credentials and roles.
- **Students**: Extended profile for students.
- **Courses/Sections**: Academic structure.
- **Attendance Sessions**: Active QR sessions with location bounds.
- **Attendance Records**: Individual check-ins with distance logs.
- **Audit Logs**: Security tracking.

---
Crafted for UniAttend.
