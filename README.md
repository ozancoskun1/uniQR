# uniQR – University QR Attendance System

Modern QR tabanlı üniversite yoklama sistemi.
Öğretmenler QR kod oluşturarak yoklama başlatabilir, öğrenciler ise mobil cihazlarıyla QR kodu okutarak derse giriş yapabilir.

---

## 🚀 Features

### 👨‍🎓 Student Features

* QR kod ile yoklama girişi
* Gerçek zamanlı kamera ile QR okuma
* Ders geçmişini görüntüleme
* Katılım oranı görüntüleme
* Profil ekranı
* Konum doğrulama desteği

### 👨‍🏫 Teacher Features

* Ders oluşturma ve yönetme
* QR tabanlı yoklama oturumu başlatma
* Gerçek zamanlı QR oluşturma
* Katılan öğrencileri görüntüleme
* Oturum geçmişi ve istatistikler
* Fullscreen QR desteği

---

## 🛠 Technologies Used

### Frontend

* React
* TypeScript
* Tailwind CSS
* Recharts
* Motion
* Lucide React
* html5-qrcode
* qrcode.react

### Backend

* Node.js
* Express.js
* JWT Authentication
* SQLite (better-sqlite3)

### Deployment

* Railway

---

## 📷 System Workflow

1. Öğretmen ders oluşturur.
2. Yoklama oturumu başlatır.
3. Sistem QR kod üretir.
4. Öğrenciler mobil cihazlarından QR kodu okutur.
5. Sistem konum ve zaman kontrolü yapar.
6. Yoklama verileri veritabanına kaydedilir.

---

## 🔐 Authentication

Sistem JWT tabanlı kimlik doğrulama kullanmaktadır.

* Öğrenci Girişi
* Öğretmen Girişi
* Token doğrulama
* Yetki bazlı erişim kontrolü

---

## 📊 Attendance Statistics

Sistem:

* Katılım oranı
* Ders bazlı istatistikler
* Öğrenci katılım geçmişi
* Oturum bazlı raporlar

sunmaktadır.

---

## 📁 Project Structure

```bash
src/
 ├── components/
 ├── pages/
 ├── routes/
 ├── database/
 ├── middleware/
 ├── utils/
 └── App.tsx
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/ozancoskun1/uniQR.git
cd uniQR
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

---

## 🌐 Deployment

Proje Railway platformu üzerinde deploy edilmiştir.

---

## 📌 Future Improvements

* NFC desteği
* Bildirim sistemi
* Öğretmen paneli geliştirmeleri
* Devamsızlık limit sistemi
* Excel/PDF rapor export
* Çoklu üniversite desteği

---

## 👨‍💻 Developer

Ozan Çoşkun
Management Information Systems – Graduation Project

---

## 📄 License

This project is developed for educational purposes.
