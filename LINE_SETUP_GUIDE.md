# 📱 คู่มือการตั้งค่า LINE Official Account & LINE LIFF
### สำหรับระบบจองห้องพักรีสอร์ท (Resort Room Booking System)

คู่มือนี้จะพาคุณตั้งค่า **LINE Developers Console**, **LINE LIFF App** และ **LINE Official Account (LINE OA)** เพื่อให้ลูกค้าสามารถกดเปิดหน้าระบบจองห้องพักผ่านห้องแชท LINE ได้ทันที

---

## 📑 สารบัญขั้นตอน
1. [สร้าง LINE Login Channel ใน LINE Developers](#1-สร้าง-line-login-channel)
2. [สร้างและตั้งค่า LINE LIFF App](#2-สร้างและตั้งค่า-line-liff-app)
3. [นำค่า LIFF ID ไปใส่ในระบบ](#3-นำค่า-liff-id-ไปใส่ในระบบ)
4. [ตั้งค่าปุ่ม Rich Menu บน LINE Official Account](#4-ตั้งค่าปุ่ม-rich-menu-บน-line-oa)
5. [การทดสอบใช้งานจริง](#5-การทดสอบใช้งานจริง)

---

## 1. สร้าง LINE Login Channel

1. เข้าไปที่เว็บไซต์ **[LINE Developers Console](https://developers.line.biz/console/)**
2. เข้าสู่ระบบด้วยบัญชี LINE ของคุณ (หรือบัญชี Business)
3. กดปุ่ม **Create a new provider** (หรือเลือก Provider เดิมที่มีอยู่)
   - ตั้งชื่อ Provider เช่น: `Paradise Resort`
4. ในหน้า Provider ให้กดปุ่ม **Create a new channel**
5. เลือกประเภท Channel: **LINE Login**
6. กรอกข้อมูล Channel:
   - **Channel name**: ชื่อรีสอร์ท เช่น `Paradise Resort Booking`
   - **Channel description**: ระบบจองห้องพักรีสอร์ท
   - **Category**: เลือกตามธุรกิจของคุณ (เช่น Hotel / Accommodations)
   - **App types**: ติ๊กเลือกทั้ง **Web app** และ **Mobile app**
7. ยอมรับเงื่อนไขแล้วกด **Create**

---

## 2. สร้างและตั้งค่า LINE LIFF App

1. คลิกเข้าไปที่ Channel ที่เพิ่งสร้างขึ้นมา
2. ไปที่แท็บ **LIFF** ด้านบน
3. กดปุ่ม **Add LIFF app** (หรือปุ่ม Add)
4. กำหนดค่าต่าง ๆ ดังนี้:
   - **LIFF app name**: `Resort Booking`
   - **Size**: เลือก **Full** (เพื่อให้เปิดเต็มจอเหมือนแอปพลิเคชัน)
   - **Endpoint URL**: ใส่ URL ของเว็บไซต์ที่ Deploy แล้วบน Vercel (หรือ localhost สำหรับทดสอบ)
     - ตัวอย่าง Production: `https://your-resort.vercel.app`
     - ตัวอย่าง Localhost: `http://localhost:3000`
   - **Scopes**: ติ๊กถูกเลือก 3 ช่อง:
     - `profile` (สำหรับดึงชื่อและรูปโปรไฟล์ LINE)
     - `openid` (สำหรับระบุตัวตนผู้ใช้)
     - `email` (สำหรับรับอีเมลแจ้งเตือนการจอง)
   - **Bot link feature**: เลือก **On (Normal)** (เพื่อให้ลูกค้าสามารถกดติดตาม LINE OA ได้อัตโนมัติ)
   - **Scan QR**: เปิดหรือไม่ก็ได้
5. กดปุ่ม **Add** ด้านล่าง
6. คุณจะได้รับ **LIFF ID** และ **LIFF URL**:
   - **LIFF ID**: เช่น `2001234567-AbCdEfGh`
   - **LIFF URL**: เช่น `https://liff.line.me/2001234567-AbCdEfGh`

---

## 3. นำค่า LIFF ID ไปใส่ในระบบ

### สำหรับการรันในเครื่อง (Local Development):
เปิดไฟล์ `.env.local` ในโปรเจกต์ แล้วแก้ไขค่าตัวแปร:

```env
NEXT_PUBLIC_LIFF_ID=2001234567-AbCdEfGh
```

### สำหรับบน Vercel (Production):
1. ไปที่ **Vercel Dashboard** -> เลือกโปรเจกต์ของคุณ
2. ไปที่ **Settings** -> **Environment Variables**
3. เพิ่มตัวแปร:
   - Key: `NEXT_PUBLIC_LIFF_ID`
   - Value: `ใส่ค่า LIFF ID ที่ได้มาจาก LINE Developers`
4. กด **Save** และทำการ **Redeploy**

---

## 4. ตั้งค่าปุ่ม Rich Menu บน LINE Official Account

เมื่อลูกค้าทักเข้ามาใน LINE OA ลูกค้าจะสามารถกดเมนูเพื่อเปิดหน้าจองห้องพักได้ทันที:

1. เข้าไปที่ **[LINE Official Account Manager](https://manager.line.biz/)**
2. เลือกบัญชี LINE Official Account ของรีสอร์ทคุณ
3. ไปที่เมนูด้านซ้าย: **หน้าหลัก (Home)** -> **ริชเมนู (Rich Menus)**
4. กดปุ่ม **สร้างริชเมนู (Create Rich Menu)**
5. ตั้งค่าภาพพื้นหลังริชเมนู (ออกแบบปุ่ม เช่น "จองห้องพัก", "โปรโมชั่น", "การจองของฉัน", "ติดต่อเรา")
6. ตั้งค่า Action ของแต่ละปุ่ม:
   - **ปุ่ม "จองห้องพัก"**:
     - ประเภท (Type): **ลิงก์ (Link / URL)**
     - ใส่ URL: `https://liff.line.me/<LIFF_ID>`
   - **ปุ่ม "การจองของฉัน"**:
     - ประเภท: **ลิงก์ (Link / URL)**
     - ใส่ URL: `https://liff.line.me/<LIFF_ID>/bookings`
   - **ปุ่ม "โปรโมชั่นพิเศษ"**:
     - ประเภท: **ลิงก์ (Link / URL)**
     - ใส่ URL: `https://liff.line.me/<LIFF_ID>/promotions`
   - **ปุ่ม "ติดต่อเรา"**:
     - ประเภท: **ข้อความ (Text)** หรือ **ลิงก์ (Link)**
7. กด **บันทึก (Save)** และเปิดใช้งานริชเมนู

---

## 5. การทดสอบใช้งานจริง

1. หยิบโทรศัพท์มือถือ เปิดแอป LINE
2. สแกน QR Code หรือเพิ่มเพื่อนกับ LINE Official Account ของรีสอร์ทคุณ
3. กดปุ่ม **"จองห้องพัก"** บนริชเมนู
4. หน้าเว็บแอปจองห้องพักจะเปิดขึ้นมาแบบเต็มหน้าจอ (Full Screen) ภายใน LINE ทันที
5. ระบบจะดึงชื่อ-รูปโปรไฟล์ LINE และบันทึกประวัติการจอง ใบจอง (Voucher) และใบเสร็จรับเงินให้ลูกค้าคนนั้นอัตโนมัติครับ! 🏨✨
