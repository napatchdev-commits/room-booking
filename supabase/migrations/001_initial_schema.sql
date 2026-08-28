-- ========================================================
-- 001_initial_schema.sql
-- RESORT ROOM BOOKING - PRODUCTION DATABASE SCHEMA
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Resort Settings Table (Single Row)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    resort_name TEXT NOT NULL DEFAULT 'My Resort & Spa',
    resort_name_en TEXT NOT NULL DEFAULT 'My Resort & Spa',
    address TEXT NOT NULL DEFAULT '123 Beach Road, Thailand',
    phone TEXT NOT NULL DEFAULT '081-234-5678',
    email TEXT NOT NULL DEFAULT 'contact@resort.com',
    line_id TEXT DEFAULT '@resort',
    line_liff_id TEXT,
    logo_url TEXT,
    tax_id TEXT,
    bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
    check_in_time TIME NOT NULL DEFAULT '14:00',
    check_out_time TIME NOT NULL DEFAULT '12:00',
    policy_terms TEXT DEFAULT 'Check-in from 14:00. Check-out before 12:00. No smoking inside rooms.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings if empty
INSERT INTO settings (id, resort_name, resort_name_en, address, phone, email)
VALUES ('default', 'Paradise Resort & Spa', 'Paradise Resort & Spa', '88/8 Beachfront Rd, Koh Samui, Thailand', '089-999-9999', 'booking@paradiseresort.com')
ON CONFLICT (id) DO NOTHING;

-- 2. User Profiles (Admin, Staff, Owner, Customer)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- linked to supabase auth.users if available
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'CUSTOMER')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Permissions Matrix
CREATE TABLE IF NOT EXISTS permissions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL
);

INSERT INTO permissions (code, name, description, module) VALUES
('booking.view', 'View Bookings', 'Can view booking list and details', 'booking'),
('booking.create', 'Create Booking', 'Can create new booking', 'booking'),
('booking.edit', 'Edit Booking', 'Can modify booking dates/rooms', 'booking'),
('booking.cancel', 'Cancel Booking', 'Can cancel an existing booking', 'booking'),
('payment.view', 'View Payments', 'Can view payment records and slips', 'payment'),
('payment.verify', 'Verify Payments', 'Can approve/reject customer payment slips', 'payment'),
('receipt.view', 'View Receipts', 'Can view generated receipts', 'receipt'),
('receipt.create', 'Create Receipt', 'Can issue official receipts for verified payments', 'receipt'),
('receipt.cancel', 'Cancel Receipt', 'Can cancel an issued receipt', 'receipt'),
('report.view', 'View Reports', 'Can view financial and occupancy reports', 'report'),
('promotion.manage', 'Manage Promotions', 'Can create, edit, and toggle promotions', 'promotion'),
('discount.manage', 'Manage Manual Discounts', 'Can apply special manual discounts to bookings', 'discount'),
('room.manage', 'Manage Rooms', 'Can create, edit, and update rooms & room types', 'room'),
('user.manage', 'Manage Users', 'Can manage staff accounts and roles', 'user'),
('settings.manage', 'Manage Settings', 'Can edit resort profile, logo, and bank accounts', 'settings')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'CUSTOMER')),
    permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_code)
);

-- Assign default permissions
-- OWNER: all permissions
INSERT INTO role_permissions (role, permission_code)
SELECT 'OWNER', code FROM permissions
ON CONFLICT DO NOTHING;

-- ADMIN: all except user.manage (or all)
INSERT INTO role_permissions (role, permission_code)
SELECT 'ADMIN', code FROM permissions
ON CONFLICT DO NOTHING;

-- STAFF: operational permissions
INSERT INTO role_permissions (role, permission_code) VALUES
('STAFF', 'booking.view'),
('STAFF', 'booking.create'),
('STAFF', 'booking.edit'),
('STAFF', 'payment.view'),
('STAFF', 'payment.verify'),
('STAFF', 'receipt.view'),
('STAFF', 'room.manage'),
('STAFF', 'report.view')
ON CONFLICT DO NOTHING;

-- CUSTOMER: own booking view
INSERT INTO role_permissions (role, permission_code) VALUES
('CUSTOMER', 'booking.view'),
('CUSTOMER', 'booking.create')
ON CONFLICT DO NOTHING;

-- 4. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    id_card TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. LINE Users (Mapped to Customer)
CREATE TABLE IF NOT EXISTS line_users (
    line_user_id TEXT PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    picture_url TEXT,
    status_message TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Room Types
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    base_capacity INT NOT NULL DEFAULT 2,
    max_capacity INT NOT NULL DEFAULT 4,
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    cover_image TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_number TEXT NOT NULL UNIQUE,
    room_name TEXT NOT NULL,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    capacity INT NOT NULL DEFAULT 2,
    details TEXT,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'occupied', 'maintenance')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Room Images
CREATE TABLE IF NOT EXISTS room_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_nights INT NOT NULL DEFAULT 1,
    applicable_room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
    applicable_days_of_week INT[] DEFAULT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Bookings Sequence & Table
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START WITH 1;

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_nights INT NOT NULL CHECK (total_nights > 0),
    num_guests INT NOT NULL DEFAULT 1,
    subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    promotion_discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    manual_discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_booking_dates CHECK (check_out_date > check_in_date)
);

-- 11. Booking Items (Rooms snapshot)
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    room_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    price_per_night NUMERIC(10,2) NOT NULL, -- snapshot price at time of booking
    nights INT NOT NULL,
    item_subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Booking Discounts
CREATE TABLE IF NOT EXISTS booking_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('PROMOTION', 'MANUAL')),
    promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    discount_value NUMERIC(10,2) NOT NULL,
    applied_amount NUMERIC(10,2) NOT NULL,
    reason TEXT,
    authorized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('FULL', 'DEPOSIT', 'INSTALLMENT', 'REMAINING')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('PROMPTPAY_QR', 'BANK_TRANSFER', 'CASH', 'CREDIT_CARD')),
    slip_url TEXT,
    slip_uploaded_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Receipts
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START WITH 1;

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number TEXT NOT NULL UNIQUE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issued_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cancel_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Receipt Items
CREATE TABLE IF NOT EXISTS receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details_before JSONB,
    details_after JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_room ON booking_items(room_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_receipts_booking ON receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_line_users_customer ON line_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
