# 🏨 ระบบจองห้องพักรีสอร์ทผ่าน LINE (LINE LIFF + Agoda Style Booking)

ระบบเว็บแอปพลิเคชันสำหรับจองห้องพักรีสอร์ท เชื่อมต่อกับ LINE Official Account ผ่าน **LINE LIFF** รูปแบบการใช้งานสไตล์ OTA ชั้นนำอย่าง **Agoda** พร้อมระบบบริหารจัดการรีสอร์ทเต็มรูปแบบ (Back-office Management), ระบบคำนวณราคาและส่วนลดหลายระดับ, ระบบชำระเงิน/มัดจำ/แบ่งชำระ, ระบบออกใบเสร็จรับเงินตามสิทธิ์ (RBAC), ป้องกันการจองซ้ำซ้อน (Collision Prevention) และรายงานสถิติส่งออก Excel

---

## 🛠️ Technology Stack

- **Frontend & Backend/API**: [Next.js](https://nextjs.org/) 14 (App Router) + TypeScript
- **Database & Storage & RLS**: [Supabase](https://supabase.com/) (PostgreSQL + Row-Level Security)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Responsive Mobile-First & Desktop)
- **LINE Integration**: [@line/liff](https://developers.line.biz/en/docs/liff/) SDK
- **Document & Export**:
  - `jspdf` + `jspdf-autotable` สำหรับสร้างใบยืนยันการจอง (Voucher) และใบเสร็จรับเงิน (Official Receipt)
  - `xlsx` (SheetJS) สำหรับส่งออกรายงานการเงินและรายการจองเป็น Excel (.xlsx)

---

## 📋 ฟังก์ชันสำคัญของระบบ

### 1. ระบบลูกค้าผ่าน LINE LIFF (Customer Portal)
- ตรวจสอบและเชื่อมต่อ LINE User ID กับข้อมูลลูกค้า (Customer) อัตโนมัติ
- เมนูหลัก:
  - **จองห้องพัก**: หน้าแรกค้นหาห้องว่างสไตล์ Agoda (ระบุวันเช็คอิน เช็คเอาท์ จำนวนผู้เข้าพัก คำนวณคืนอัตโนมัติ)
  - **ห้องพัก**: รายการห้องพักทั้งหมด แสดงภาพขนาดใหญ่ สิ่งอำนวยความสะดวก ราคาเดิมขีดฆ่า และราคาโปรโมชั่น
  - **โปรโมชั่น**: แสดงโค้ดส่วนลด คัดลอกโค้ดไปใช้ในหน้า Checkout ได้ทันที
  - **การจองของฉัน**: ประวัติการจอง พร้อมปุ่มดูใบจอง ชำระเงิน และใบเสร็จ
  - **ใบจอง (Voucher)**: แสดงรายละเอียดการจอง ยอดรวม ส่วนลด ยอดชำระ ยอดคงเหลือ พร้อมปุ่มดาวน์โหลด PDF และพิมพ์
  - **ชำระเงิน**: รองรับชำระเต็มจำนวน, มัดจำ 50%, ระบุยอดแบ่งชำระเป็นงวด, พร้อมเพย์ QR, บัญชีธนาคาร และแนบรูปสลิป
  - **ใบเสร็จรับเงิน (Receipt)**: ดูใบเสร็จที่ออกตามยอดชำระจริง พร้อมดาวน์โหลด PDF

### 2. ระบบบริหารจัดการหลังบ้าน (Admin & Staff Portal)
- **Dashboard**: แสดง KPI สด (ห้องทั้งหมด, ห้องว่าง, จองแล้ว, Check-in วันนี้, Check-out วันนี้, Booking วันนี้, รายได้สุทธิ, ยอดค้างชำระ, สลิปรอตรวจ)
- **ปฏิทินห้องพัก (Room Calendar)**: แสดงสถานะห้องพักและวันที่แบบ Timeline Matrix (Gantt View)
- **จัดการห้องพัก & ประเภทห้อง**: เพิ่ม/แก้ไข/ลบ กำหนดราคาต่อคืน จำนวนผู้เข้าพัก สิ่งอำนวยความสะดวก รูปภาพ และสถานะ (ว่าง, จองแล้ว, เข้าพัก, ปิดปรับปรุง)
- **จัดการรายการจอง**: ตรวจสอบสถานะการจอง ปรับสถานะเช็คอิน/เช็คเอาท์
- **ส่วนลด Manual (Admin Discount)**: ผู้มีสิทธิ์ `discount.manage` สามารถให้ส่วนลดพิเศษ (% หรือบาท) ระบุเหตุผล และบันทึกลง Audit Log อัตโนมัติ
- **ตรวจสอบการชำระเงิน (Payments Queue)**: ตรวจสอบรูปภาพสลิป ขยายดูภาพสลิป อนุมัติหรือปฏิเสธพร้อมระบุเหตุผล
- **ระบบใบเสร็จรับเงิน (Official Receipts)**:
  - ออกใบเสร็จตามยอดเงินที่ชำระจริง (ไม่ใช่ยอด Booking ทั้งหมด)
  - ตรวจสอบสิทธิ์ `receipt.create` ในการออกใบเสร็จ
  - ตรวจสอบสิทธิ์ `receipt.cancel` ในการยกเลิกใบเสร็จ (ห้ามลบถาวร ต้องระบุเหตุผลการยกเลิก)
- **ระบบโปรโมชั่น (Promotions)**: สร้างโปรโมชั่นลด % หรือบาท กำหนดจำนวนคืนขั้นต่ำ เฉพาะประเภทห้อง และช่วงวันใช้งาน
- **รายงานและสถิติ (Reports & Export)**: สรุปรายได้รายวัน รายได้รายเดือน สถิติห้องพักยอดนิยม พร้อมปุ่มส่งออกเป็นไฟล์ Excel (.xlsx)
- **บันทึกประวัติการทำงาน (Audit Logs)**: บันทึกการกระทำสำคัญ ผู้ทำรายการ วันที่ เวลา ข้อมูลก่อนและหลังแก้ไข

### 3. ระบบความปลอดภัยและสิทธิ์การใช้งาน (RBAC & RLS)
- **บทบาทผู้ใช้งาน (Roles)**:
  - `OWNER`: จัดการได้ทุกส่วนของระบบ
  - `ADMIN`: จัดการห้องพัก รายการจอง การเงิน โปรโมชั่น ส่วนลดพิเศษ และตั้งค่า
  - `STAFF`: ตรวจสอบรายการจอง ตรวจสอบสลิป ออกใบเสร็จ เช็คอิน/เช็คเอาท์
  - `CUSTOMER`: เข้าถึงเฉพาะข้อมูลการจองและการชำระเงินของตนเอง
- **สูตรคำนวณราคาฝั่ง Server**:
  `ราคาห้องเต็ม -> หักโปรโมชั่น -> หักส่วนลด Manual -> ยอดสุทธิ -> หักเงินที่ชำระแล้ว -> ยอดคงเหลือ`
- **ป้องกันการจองซ้ำ (Collision Prevention)**: ตรวจสอบช่วงวันที่ทับซ้อนทั้งระดับ API และ Database Lock (`FOR UPDATE`)

---

## 🚀 ขั้นตอนการติดตั้งและการตั้งค่าระบบ

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าฐานข้อมูล Supabase
1. เข้าไปที่ [Supabase Dashboard](https://supabase.com/dashboard) และสร้างโปรเจกต์ใหม่
2. ไปที่เมนู **SQL Editor**
3. คัดลอกเนื้อหาทั้งหมดจากไฟล์ [`supabase/schema.sql`](supabase/schema.sql) และกด **Run**
4. ไปที่เมนู **Storage** และรันคำสั่งในไฟล์ [`supabase/storage_setup.sql`](supabase/storage_setup.sql) เพื่อสร้าง Bucket:
   - `room-images` (Public)
   - `resort-assets` (Public)
   - `payment-slips` (Public)
   - `documents` (Public)

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` โดยคัดลอกจาก `.env.example`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# LINE LIFF Configuration
NEXT_PUBLIC_LIFF_ID=your-liff-id-here
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret

# Application Base URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 4. รันระบบสำหรับทดสอบ (Development Server)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`

### 5. Build สำหรับ Production
```bash
npm run build
npm run start
```

---

## 🌐 การ Deploy บน Vercel

1. Push โค้ดขึ้นบน GitHub Repository ของคุณ
2. เข้าสู่ [Vercel Dashboard](https://vercel.com/) และเลือก **Add New Project**
3. Import Repository จาก GitHub
4. ในส่วน **Environment Variables** ให้กรอกค่าตัวแปร:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_LIFF_ID`
   - `NEXT_PUBLIC_APP_URL`
5. กด **Deploy**

---

## 📱 การเชื่อมต่อ LINE LIFF

1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Provider และ Channel (LINE Login)
3. ไปที่แท็บ **LIFF** แล้วกด **Add**
4. กำหนดค่า:
   - **Size**: Full
   - **Endpoint URL**: ใส่ URL ที่ Deploy บน Vercel (เช่น `https://your-resort.vercel.app`)
   - **Scopes**: `profile`, `openid`, `email`
5. คัดลอก **LIFF ID** มาใส่ใน `NEXT_PUBLIC_LIFF_ID`

---

## 📂 โครงสร้างโฟลเดอร์ของโปรเจกต์

```
├── app/
│   ├── (customer)/             # Customer LINE LIFF Pages
│   │   ├── page.tsx            # Agoda-style Booking Search & Hero
│   │   ├── checkout/           # Agoda-style Checkout
│   │   ├── rooms/              # Room Catalog
│   │   ├── bookings/           # My Bookings & Voucher View
│   │   ├── promotions/         # Promotions Showcase
│   │   ├── receipts/           # Official Receipt View
│   │   └── contact/            # Contact & Resort Info
│   ├── admin/                  # Admin Management Portal
│   │   ├── dashboard/          # KPI Dashboard
│   │   ├── calendar/           # Timeline Matrix Room Calendar
│   │   ├── rooms/              # Rooms & Categories CRUD
│   │   ├── bookings/           # Bookings & Manual Discount
│   │   ├── payments/           # Slip Verification Queue
│   │   ├── receipts/           # Receipt Issuer & Canceller
│   │   ├── promotions/         # Promotions Manager
│   │   ├── reports/            # Financial Reports & Excel Export
│   │   ├── audit-logs/         # Audit Trail Viewer
│   │   └── settings/           # Resort Profile & Bank Accounts
│   └── api/                    # Server-side Secure API Endpoints
│       ├── auth/liff/          # LINE LIFF profile sync
│       ├── rooms/              # Room availability & CRUD
│       ├── bookings/           # Atomic booking creation & discounts
│       ├── payments/           # Payment submission & verification
│       ├── receipts/           # Receipt issuance & cancellation
│       ├── promotions/         # Promotion management
│       ├── reports/            # Analytics & KPIs
│       ├── audit-logs/         # Audit event queries
│       └── settings/           # Resort settings
├── components/
│   ├── providers/              # LIFF & Auth Context
│   └── ui/                     # Agoda Search Bar, Room Cards, Navbars
├── lib/
│   ├── supabase/               # Browser, Server & Admin clients
│   ├── pricing.ts              # Server-side Calculation Engine
│   ├── permissions.ts          # RBAC Permission Checker
│   ├── pdf-generator.ts        # jsPDF Voucher & Receipt generator
│   ├── excel-export.ts         # SheetJS Excel exporter
│   ├── formatters.ts           # Thai Date & Currency Formatters
│   ├── audit.ts                # Audit Logger helper
│   └── liff.ts                 # LINE LIFF SDK wrapper
├── supabase/
│   ├── migrations/             # SQL Migrations (001, 002, 003)
│   ├── schema.sql              # Consolidated 1-Click Database Setup
│   └── storage_setup.sql       # Storage Buckets & Policies Setup
├── types/
│   └── database.ts             # TypeScript Database Schema Types
├── .env.example
├── package.json
└── tailwind.config.ts
```
