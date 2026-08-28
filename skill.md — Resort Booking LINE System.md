# Resort Booking LINE System — Development Skill

## 1. ROLE

You are a senior full-stack engineer responsible for developing a production-ready resort room booking system.

The system must work through:

- LINE LIFF
- Web Browser
- Admin Dashboard

Technology:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- GitHub
- Vercel
- LINE LIFF

Do not create a mockup-only application.

All important functions must connect to the real Supabase database.

---

# 2. CORE PRINCIPLES

Always follow these rules:

1. No demo data.
2. No sample customers.
3. No sample rooms.
4. No fake bookings.
5. No fake payments.
6. No fake receipts.
7. No hardcoded business data.
8. Never use LocalStorage as the primary database.
9. Supabase is the persistent database.
10. Server-side validation is mandatory.
11. Never trust calculation values sent from the client.
12. Customer data must be protected by RLS.
13. Payment data must be protected.
14. Receipt data must be protected.
15. Permission must be checked on the server.
16. Never expose Supabase Service Role Key to the browser.
17. Never expose private environment variables through NEXT_PUBLIC_.
18. Prevent duplicate room bookings at the database level.
19. Preserve historical booking prices.
20. Never silently modify issued receipts.

---

# 3. ARCHITECTURE

Use:

Frontend:

Next.js App Router
TypeScript
Tailwind CSS

Backend:

Next.js Server Actions / Route Handlers

Database:

Supabase PostgreSQL

Authentication:

Supabase Auth

File Storage:

Supabase Storage

LINE:

LINE LIFF

Source Control:

GitHub

Deployment:

Vercel

Architecture:

Customer
↓
LINE LIFF
↓
Next.js
↓
Server API
↓
Supabase

Admin
↓
Next.js Admin Dashboard
↓
Server API
↓
Supabase

---

# 4. USER ROLES

Create:

OWNER
ADMIN
STAFF
CUSTOMER

Do not assume that every ADMIN has every permission.

Use explicit permissions.

Examples:

room.view
room.create
room.edit
room.delete

booking.view
booking.create
booking.edit
booking.cancel

payment.view
payment.verify

promotion.view
promotion.create
promotion.edit
promotion.delete

discount.view
discount.create
discount.edit

receipt.view
receipt.create
receipt.cancel

report.view
user.manage
settings.manage

---

# 5. PERMISSION RULE

Permission checks must happen:

1. Frontend
2. Server
3. Database/RLS where applicable

Never rely only on hiding a button.

Example:

If a user does not have:

receipt.create

the API must reject the request even if the user manually calls the API.

---

# 6. CUSTOMER SYSTEM

Customers access the system through LINE LIFF.

Customer identity should be linked to:

LINE User ID

Customer should be able to:

- Search rooms
- Select check-in
- Select check-out
- Select guests
- View available rooms
- View room details
- View promotions
- View discounts
- Create booking
- Upload payment slip
- View booking
- View booking document
- View payment history
- View issued receipts

Customer must only see their own records.

---

# 7. ROOM BOOKING

Booking is based on full nights.

Example:

Check-in:
28/08/2026

Check-out:
30/08/2026

Number of nights:

2

Formula:

check_out - check_in

Do not support hourly booking.

Do not allow check-out before check-in.

Do not allow zero-night booking.

---

# 8. ROOM AVAILABILITY

A room is unavailable when an existing confirmed/active booking overlaps the requested period.

Overlap condition:

existing_check_in < requested_check_out

AND

existing_check_out > requested_check_in

Use this rule consistently.

Do not rely only on frontend availability.

The server must re-check availability immediately before creating the booking.

Database constraints/transaction logic must prevent race-condition duplicate bookings.

---

# 9. ROOM PRICE

Each room/type can have a base price.

Booking must store a price snapshot.

Example:

room price at booking time:

1,500 THB

Later Admin changes room price to:

1,800 THB

Existing booking must remain:

1,500 THB

Never recalculate historical bookings using the current room price.

---

# 10. PROMOTION

Promotion is automatic.

Admin can create:

- Percentage discount
- Fixed amount discount
- Specific room type
- Minimum nights
- Specific date range
- Weekday promotion
- Weekend promotion
- Holiday promotion
- Active/inactive

Promotion fields should include:

name
description
discount_type
discount_value
start_date
end_date
minimum_nights
room_type_id
status

---

# 11. CUSTOMER PROMOTION DISPLAY

Promotion must be visible to customers.

Room card should show:

Original price

Discount

Final price

Example:

1,500 THB/night

~~1,500~~

1,350 THB/night

10% OFF

For 2 nights:

3,000 THB

Promotion:

-300 THB

Final:

2,700 THB

Do not hide the original price.

---

# 12. MANUAL DISCOUNT

Manual discount is different from Promotion.

Promotion:

Automatic based on configured rules.

Manual discount:

Added by authorized Admin/Staff.

Support:

percentage

fixed amount

Manual discount must store:

booking_id
discount_type
discount_value
discount_amount
reason
created_by
created_at

Customer can see the applied manual discount.

Customer cannot create or modify manual discounts.

---

# 13. PRICE CALCULATION

The authoritative calculation happens on the server.

Calculation order:

1. Calculate room price
2. Calculate number of nights
3. Calculate gross room amount
4. Apply promotion
5. Apply manual discount
6. Calculate net amount
7. Calculate paid amount
8. Calculate remaining amount

Example:

Room:

1,500 × 3 nights

Gross:

4,500

Promotion:

-450

Manual discount:

-200

Net:

3,850

Paid:

1,000

Remaining:

2,850

Do not accept final_total from the browser as authoritative.

---

# 14. MONEY HANDLING

Do not use floating-point arithmetic for financial calculations.

Use integer smallest currency units or PostgreSQL numeric/decimal.

For Thai Baht:

Use 2 decimal places where required.

All calculations must avoid floating-point rounding errors.

---

# 15. BOOKING NUMBER

Generate a unique Booking Number.

Example format:

RES-YYYYMMDD-XXXX

Do not rely only on the frontend to generate unique numbers.

Database must enforce uniqueness.

---

# 16. BOOKING STATUS

Support:

PENDING_PAYMENT
WAITING_PAYMENT_VERIFICATION
CONFIRMED
PARTIALLY_PAID
PAID
CHECKED_IN
CHECKED_OUT
CANCELLED

Status transitions must be validated.

Do not allow arbitrary status changes.

---

# 17. PAYMENT

Payment belongs to a Booking.

Support:

- Full payment
- Deposit
- Partial payment
- Multiple payments

Example:

Booking:

3,850

Payment 1:

1,000

Payment 2:

2,850

Total paid:

3,850

Remaining:

0

Never manually overwrite total paid.

Calculate from payment records.

---

# 18. PAYMENT SLIP

Customer may upload a payment slip.

Store files in Supabase Storage.

Do not expose private files publicly.

Use secure access.

Payment status:

PENDING
WAITING_VERIFICATION
VERIFIED
REJECTED

Admin verifies the payment.

---

# 19. BOOKING DOCUMENT

After booking is created successfully, generate a booking document.

Booking document must contain:

- Resort logo
- Resort name
- Booking number
- Date issued
- Customer
- Phone
- Room
- Check-in
- Check-out
- Number of nights
- Guests
- Original price
- Promotion
- Manual discount
- Net amount
- Paid amount
- Remaining amount
- Booking status

Customer can:

- View
- Print
- Download PDF
- Open from LINE

---

# 20. RECEIPT SYSTEM

Receipt is separate from Booking.

Relationship:

Booking
↓
Payment
↓
Receipt

Receipt must be based on actual Payment.

If customer pays:

1,000

Receipt amount:

1,000

Not:

3,850

unless the actual payment is 3,850.

---

# 21. RECEIPT PERMISSION

Customer:

Cannot create receipt.

Customer can only view receipts already issued to their own account.

Staff:

Cannot issue receipt unless they have:

receipt.create

Admin:

Can issue receipt if permission exists.

Owner:

Full receipt control.

---

# 22. RECEIPT STATUS

Use:

DRAFT
ISSUED
CANCELLED

Issued receipt must not be hard-deleted.

If incorrect:

Cancel the receipt.

Store:

cancelled_by
cancelled_at
cancel_reason

Then create a new receipt.

---

# 23. RECEIPT NUMBER

Receipt numbers must be unique.

Generate on the server.

Never trust a receipt number sent from the browser.

---

# 24. RECEIPT CONTENT

Receipt should include:

- Resort logo
- Resort name
- Address
- Phone
- Receipt number
- Issue date
- Booking number
- Customer name
- Payment description
- Payment amount
- Payment method
- Receiver
- Notes

Show amount in numeric form and Thai text where appropriate.

---

# 25. AUDIT LOG

Record sensitive operations.

Examples:

Booking created
Booking modified
Booking cancelled
Promotion created
Promotion modified
Manual discount added
Payment verified
Receipt issued
Receipt cancelled
Permission changed

Store:

user_id
action
entity_type
entity_id
before_data
after_data
created_at
IP/device metadata where legally appropriate

Do not expose audit logs to normal customers.

---

# 26. DATABASE

Recommended tables:

profiles

customers

line_users

room_types

rooms

room_images

bookings

booking_items

promotions

booking_promotions

booking_discounts

payments

receipts

receipt_items

permissions

role_permissions

user_permissions

audit_logs

settings

---

# 27. DATABASE RULES

Use:

Primary Keys
Foreign Keys
Unique Constraints
Indexes
Check Constraints

Important indexes:

rooms.room_type_id

bookings.room_id

bookings.customer_id

bookings.check_in

bookings.check_out

bookings.status

payments.booking_id

receipts.booking_id

receipts.payment_id

---

# 28. SUPABASE RLS

Enable Row Level Security.

Customer:

Can read own customer record.

Can read own bookings.

Can read own payments.

Can read own receipts.

Can create their own booking through authorized server flow.

Customer must never access another customer's data.

Admin/Staff:

Access according to permissions.

Owner:

Full access.

Never disable RLS just to make development easier.

---

# 29. SUPABASE STORAGE

Use private buckets where appropriate.

Recommended:

room-images

payment-slips

documents

Payment slips must not be publicly accessible.

Use signed URLs when necessary.

---

# 30. LINE LIFF

LINE LIFF should authenticate the customer.

Store the LINE User ID securely.

Link:

LINE User
→ Customer

Customer must not be able to manually change the LINE User ID to access another account.

---

# 31. CUSTOMER MENU

LINE Rich Menu:

จองห้องพัก
ห้องพัก
โปรโมชั่น
การจองของฉัน
ใบจอง
ชำระเงิน

Optional:

ติดต่อเรา
แผนที่

---

# 32. ADMIN DASHBOARD

Dashboard should show:

- Total rooms
- Available rooms
- Occupied rooms
- Today's check-ins
- Today's check-outs
- New bookings
- Pending payments
- Revenue
- Outstanding balance

---

# 33. BOOKING CALENDAR

Create a calendar showing:

Room
Date
Booking
Check-in
Check-out
Status

Use clear status indicators.

Clicking a booking opens its details.

---

# 34. REPORTS

Reports:

Daily revenue
Monthly revenue
Booking count
Room occupancy
Popular rooms
Promotion discount
Manual discount
Payments
Outstanding balances

Export to Excel where appropriate.

---

# 35. ADMIN UI

Use:

- Mobile responsive
- Desktop responsive
- Clean modern hotel UI
- Clear typography
- Clear price hierarchy
- Tables for management
- Cards for dashboard
- Calendar for bookings

Customer UI should prioritize mobile because it is accessed through LINE.

---

# 36. CUSTOMER PRICE UI

Always show:

Original price

Promotion

Manual discount if applicable

Net price

Paid amount

Remaining amount

Example:

ค่าห้องพัก
4,500 บาท

โปรโมชั่น
-450 บาท

ส่วนลดพิเศษ
-200 บาท

ยอดสุทธิ
3,850 บาท

ชำระแล้ว
1,000 บาท

คงเหลือ
2,850 บาท

---

# 37. NO DEMO DATA

Database migration must not insert fake:

rooms
customers
bookings
payments
promotions
receipts

Do not create seed data unless explicitly requested.

---

# 38. ENVIRONMENT VARIABLES

Use:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

LINE_LIFF_ID

Other secrets must NOT use NEXT_PUBLIC_.

Never commit:

.env
.env.local

to GitHub.

Provide:

.env.example

without real secrets.

---

# 39. GITHUB

Project must be GitHub-ready.

Repository should contain:

README.md

.env.example

database migration files

Supabase configuration where appropriate

source code

tests

Do not commit:

secrets
customer data
payment slips
production credentials

---

# 40. VERCEL

Project must be deployable to Vercel.

Environment variables must be configured through Vercel.

Build must pass:

npm run build

No TypeScript errors.

No ESLint errors that block production.

No missing environment variables.

---

# 41. ERROR HANDLING

Never expose database errors directly to customers.

Use user-friendly Thai messages.

Examples:

“ไม่พบห้องว่างในวันที่เลือก”

“ไม่สามารถจองห้องนี้ได้ เนื่องจากมีผู้จองแล้ว”

“กรุณาตรวจสอบข้อมูลการชำระเงิน”

“คุณไม่มีสิทธิ์ดำเนินการนี้”

---

# 42. SECURITY

Always:

Validate input with schema validation.

Validate dates.

Validate prices.

Validate discounts.

Validate permissions.

Validate ownership.

Use parameterized database queries.

Protect API routes.

Protect Server Actions.

Use RLS.

Protect Storage.

Never trust client-side totals.

Never expose service keys.

---

# 43. DEVELOPMENT WORKFLOW

Before writing code:

1. Inspect existing project.
2. Inspect package.json.
3. Inspect environment variables.
4. Inspect Supabase configuration.
5. Inspect database schema.
6. Inspect existing routes.
7. Inspect existing components.
8. Identify reusable code.
9. Plan changes.
10. Implement incrementally.

Do not overwrite a working project blindly.

---

# 44. IMPLEMENTATION ORDER

Build in this order:

1. Project architecture
2. Supabase connection
3. Database schema
4. RLS
5. Authentication
6. Roles
7. Permissions
8. Room management
9. Availability engine
10. Booking
11. Price calculation
12. Promotion
13. Manual discount
14. Payment
15. Slip upload
16. Booking document
17. Receipt
18. Audit log
19. LINE LIFF
20. Customer UI
21. Admin Dashboard
22. Calendar
23. Reports
24. PDF
25. Security review
26. Production testing
27. GitHub
28. Vercel deployment

---

# 45. TESTING

Test at minimum:

### Booking

- One night
- Multiple nights
- Same-day invalid booking
- Check-out before check-in
- Overlapping booking
- Non-overlapping booking
- Multiple rooms

### Promotion

- Percentage
- Fixed amount
- Expired promotion
- Future promotion
- Minimum nights
- Room-specific promotion

### Manual discount

- Percentage
- Fixed amount
- Zero discount
- Discount greater than booking amount
- Unauthorized user

### Payment

- Full payment
- Deposit
- Partial payment
- Multiple payments
- Overpayment
- Rejected slip

### Receipt

- Authorized user
- Unauthorized user
- Partial payment receipt
- Full payment receipt
- Cancellation
- Reissue

### Security

- Customer accessing another customer's booking
- Customer accessing another customer's payment
- Customer accessing another customer's receipt
- Staff without receipt permission
- Direct API access without permission

---

# 46. IMPORTANT BUSINESS RULE

The final amount displayed to the customer must always match the amount calculated by the server.

The same calculation logic must be reusable across:

Customer booking page
Admin booking page
Booking document
Payment
Receipt
Reports

Do not duplicate financial calculation logic in multiple places.

Create one authoritative pricing/calculation service.

---

# 47. FINAL QUALITY REQUIREMENT

The finished system must behave as a real production booking system.

It must not be:

- UI-only
- Mockup
- Demo
- Static HTML
- LocalStorage database
- Fake API
- Fake payment
- Fake receipt

It must use:

GitHub
+
Vercel
+
Supabase
+
Next.js
+
LINE LIFF

All data must persist in Supabase.

All important operations must be authenticated, authorized, validated, logged where appropriate, and protected against duplicate booking and unauthorized access.