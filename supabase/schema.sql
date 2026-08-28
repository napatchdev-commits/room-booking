-- ==============================================================================
-- COMPLETE SUPABASE INITIALIZATION SCRIPT (V2 - RLS ENABLED & API ACCESSIBLE)
-- RESORT ROOM BOOKING SYSTEM (LINE LIFF + AGODA STYLE + RBAC + RLS)
-- Run this complete script in your Supabase SQL Editor to initialize all tables!
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Resort Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    resort_name TEXT NOT NULL DEFAULT 'Paradise Resort & Spa',
    resort_name_en TEXT NOT NULL DEFAULT 'Paradise Resort & Spa',
    address TEXT NOT NULL DEFAULT '88/8 Beachfront Rd, Koh Samui, Thailand',
    phone TEXT NOT NULL DEFAULT '089-999-9999',
    email TEXT NOT NULL DEFAULT 'booking@paradiseresort.com',
    line_id TEXT DEFAULT '@paradiseresort',
    line_liff_id TEXT,
    logo_url TEXT,
    tax_id TEXT DEFAULT '0105550000000',
    bank_accounts JSONB NOT NULL DEFAULT '[
        {"bank_name": "Kasikorn Bank (KBank)", "account_number": "123-4-56789-0", "account_name": "Paradise Resort Co., Ltd.", "promptpay_id": "0899999999"}
    ]'::jsonb,
    check_in_time TIME NOT NULL DEFAULT '14:00',
    check_out_time TIME NOT NULL DEFAULT '12:00',
    policy_terms TEXT DEFAULT 'Check-in from 14:00. Check-out before 12:00. No smoking inside rooms.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (id, resort_name, resort_name_en, address, phone, email)
VALUES ('default', 'Paradise Resort & Spa', 'Paradise Resort & Spa', '88/8 Beachfront Rd, Koh Samui, Thailand', '089-999-9999', 'booking@paradiseresort.com')
ON CONFLICT (id) DO NOTHING;

-- 3. User Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE,
    email TEXT UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'CUSTOMER')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Permissions Matrix
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

INSERT INTO role_permissions (role, permission_code)
SELECT 'OWNER', code FROM permissions ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_code)
SELECT 'ADMIN', code FROM permissions ON CONFLICT DO NOTHING;

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

INSERT INTO role_permissions (role, permission_code) VALUES
('CUSTOMER', 'booking.view'),
('CUSTOMER', 'booking.create')
ON CONFLICT DO NOTHING;

-- 5. Customers
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

-- 6. LINE Users
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

-- 7. Room Types
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

-- 8. Rooms
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

-- 9. Room Images
CREATE TABLE IF NOT EXISTS room_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_nights INT NOT NULL DEFAULT 1,
    applicable_room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
    applicable_days_of_week INT[] DEFAULT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Bookings
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

-- 12. Booking Items
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    room_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    price_per_night NUMERIC(10,2) NOT NULL,
    nights INT NOT NULL,
    item_subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Booking Discounts
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

-- 14. Payments
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

-- 15. Receipts
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

-- 16. Receipt Items
CREATE TABLE IF NOT EXISTS receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Audit Logs
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

-- Indexes
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

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL 17 TABLES WITH PROPER POLICIES
-- ==============================================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Settings
    DROP POLICY IF EXISTS "Allow all for settings" ON settings;
    CREATE POLICY "Allow all for settings" ON settings FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Room Types & Rooms & Images
    DROP POLICY IF EXISTS "Allow all for room_types" ON room_types;
    CREATE POLICY "Allow all for room_types" ON room_types FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for rooms" ON rooms;
    CREATE POLICY "Allow all for rooms" ON rooms FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for room_images" ON room_images;
    CREATE POLICY "Allow all for room_images" ON room_images FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Promotions
    DROP POLICY IF EXISTS "Allow all for promotions" ON promotions;
    CREATE POLICY "Allow all for promotions" ON promotions FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Permissions & Roles
    DROP POLICY IF EXISTS "Allow all for permissions" ON permissions;
    CREATE POLICY "Allow all for permissions" ON permissions FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for role_permissions" ON role_permissions;
    CREATE POLICY "Allow all for role_permissions" ON role_permissions FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for profiles" ON profiles;
    CREATE POLICY "Allow all for profiles" ON profiles FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Customers & LINE Users
    DROP POLICY IF EXISTS "Allow all for customers" ON customers;
    CREATE POLICY "Allow all for customers" ON customers FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for line_users" ON line_users;
    CREATE POLICY "Allow all for line_users" ON line_users FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Bookings & Items & Discounts
    DROP POLICY IF EXISTS "Allow all for bookings" ON bookings;
    CREATE POLICY "Allow all for bookings" ON bookings FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for booking_items" ON booking_items;
    CREATE POLICY "Allow all for booking_items" ON booking_items FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for booking_discounts" ON booking_discounts;
    CREATE POLICY "Allow all for booking_discounts" ON booking_discounts FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Payments
    DROP POLICY IF EXISTS "Allow all for payments" ON payments;
    CREATE POLICY "Allow all for payments" ON payments FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Receipts & Items
    DROP POLICY IF EXISTS "Allow all for receipts" ON receipts;
    CREATE POLICY "Allow all for receipts" ON receipts FOR ALL USING (TRUE) WITH CHECK (TRUE);

    DROP POLICY IF EXISTS "Allow all for receipt_items" ON receipt_items;
    CREATE POLICY "Allow all for receipt_items" ON receipt_items FOR ALL USING (TRUE) WITH CHECK (TRUE);

    -- Audit Logs
    DROP POLICY IF EXISTS "Allow all for audit_logs" ON audit_logs;
    CREATE POLICY "Allow all for audit_logs" ON audit_logs FOR ALL USING (TRUE) WITH CHECK (TRUE);
END $$;

-- Collision Check & Auto Number Functions
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_val BIGINT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    seq_val := nextval('booking_number_seq');
    RETURN 'RES-' || today_str || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_val BIGINT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    seq_val := nextval('receipt_number_seq');
    RETURN 'RC-' || today_str || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_room_available(
    p_room_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_count INT;
    v_room_status TEXT;
BEGIN
    SELECT status INTO v_room_status FROM rooms WHERE id = p_room_id;
    IF v_room_status = 'maintenance' THEN
        RETURN FALSE;
    END IF;

    SELECT COUNT(*)
    INTO v_conflict_count
    FROM bookings b
    JOIN booking_items bi ON bi.booking_id = b.id
    WHERE bi.room_id = p_room_id
      AND b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
      AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
      AND (b.check_in_date < p_check_out AND b.check_out_date > p_check_in);

    RETURN (v_conflict_count = 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_booking_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(10,2);
    v_net_total NUMERIC(10,2);
    v_booking_id UUID;
BEGIN
    v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_paid
    FROM payments
    WHERE booking_id = v_booking_id AND status = 'VERIFIED';

    SELECT net_total INTO v_net_total FROM bookings WHERE id = v_booking_id;

    UPDATE bookings
    SET
        paid_amount = v_total_paid,
        remaining_balance = GREATEST(0.00, v_net_total - v_total_paid),
        status = CASE
            WHEN status = 'CANCELLED' THEN 'CANCELLED'
            WHEN status = 'CHECKED_IN' THEN 'CHECKED_IN'
            WHEN status = 'CHECKED_OUT' THEN 'CHECKED_OUT'
            WHEN v_total_paid > 0 THEN 'CONFIRMED'
            ELSE 'PENDING'
        END,
        updated_at = NOW()
    WHERE id = v_booking_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_payment_status ON payments;
CREATE TRIGGER trigger_sync_payment_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION sync_booking_payment_status();
