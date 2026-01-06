# Real-time Chat Application

## การติดตั้ง

1. ติดตั้ง dependencies:
```bash
npm install
```

2. รันเซิร์ฟเวอร์:
```bash
node server.js
```

3. เปิดเบราว์เซอร์ไปที่:
```
http://localhost:3000
```

## โครงสร้างโปรเจกต์

```
├── controllers/     # Controller สำหรับจัดการ logic
├── database/        # Database connection
├── middleware/      # Middleware (authentication, upload)
├── models/          # Data models
├── public/          # Static files (CSS, JS, uploads)
├── routes/          # Route handlers
├── views/           # EJS templates
└── server.js        # Entry point
```

## หมายเหตุ

- ไฟล์ที่อัพโหลดจะถูกเก็บไว้ใน `public/uploads/`
- ฐานข้อมูล SQLite ถูกเก็บไว้ใน `chat.db`

