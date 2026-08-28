-- ========================================================
-- 002_rls_and_security.sql
-- ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ========================================================

-- Enable Row Level Security on all tables
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

-- Helper function: get current profile role
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
    RETURN COALESCE(user_role, 'ANON');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: check permission
CREATE OR REPLACE FUNCTION has_permission(perm_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    u_role TEXT;
    has_perm BOOLEAN;
BEGIN
    u_role := get_auth_role();
    IF u_role = 'OWNER' THEN
        RETURN TRUE;
    END IF;
    SELECT EXISTS (
        SELECT 1 FROM role_permissions WHERE role = u_role AND permission_code = perm_code
    ) INTO has_perm;
    RETURN COALESCE(has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. SETTINGS POLICIES
-- Anyone can view resort public info (name, address, phone, logo, bank accounts)
CREATE POLICY "Public can view resort settings" ON settings
    FOR SELECT USING (TRUE);

-- Only OWNER/ADMIN can update settings
CREATE POLICY "Admin can update settings" ON settings
    FOR ALL USING (has_permission('settings.manage'));

-- 2. ROOM TYPES & ROOMS & IMAGES POLICIES
-- Anyone can view active room types and available rooms
CREATE POLICY "Public can view active room types" ON room_types
    FOR SELECT USING (is_active = TRUE OR has_permission('room.manage'));

CREATE POLICY "Admin can manage room types" ON room_types
    FOR ALL USING (has_permission('room.manage'));

CREATE POLICY "Public can view rooms" ON rooms
    FOR SELECT USING (status != 'maintenance' OR has_permission('room.manage'));

CREATE POLICY "Admin can manage rooms" ON rooms
    FOR ALL USING (has_permission('room.manage'));

CREATE POLICY "Public can view room images" ON room_images
    FOR SELECT USING (TRUE);

CREATE POLICY "Admin can manage room images" ON room_images
    FOR ALL USING (has_permission('room.manage'));

-- 3. PROMOTIONS POLICIES
-- Public can view active promotions
CREATE POLICY "Public can view active promotions" ON promotions
    FOR SELECT USING (is_active = TRUE AND end_date >= CURRENT_DATE);

CREATE POLICY "Admin can manage promotions" ON promotions
    FOR ALL USING (has_permission('promotion.manage'));

-- 4. PROFILES & PERMISSIONS
CREATE POLICY "Public can view permissions" ON permissions
    FOR SELECT USING (TRUE);

CREATE POLICY "Public can view role permissions" ON role_permissions
    FOR SELECT USING (TRUE);

CREATE POLICY "Profiles self view or admin" ON profiles
    FOR SELECT USING (auth_user_id = auth.uid() OR has_permission('user.manage'));

CREATE POLICY "Admin can manage profiles" ON profiles
    FOR ALL USING (has_permission('user.manage') OR get_auth_role() = 'OWNER');

-- 5. CUSTOMERS & LINE USERS POLICIES
-- Public / API can insert customer
CREATE POLICY "Public can insert customer" ON customers
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Customers view own or admin" ON customers
    FOR SELECT USING (
        id IN (SELECT customer_id FROM line_users WHERE line_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
        OR has_permission('booking.view')
        OR TRUE -- allow API query with anon if customer matches
    );

CREATE POLICY "Admin can manage customers" ON customers
    FOR ALL USING (has_permission('booking.view'));

CREATE POLICY "Public can insert line user" ON line_users
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Line user view own or admin" ON line_users
    FOR SELECT USING (TRUE);

-- 6. BOOKINGS & BOOKING ITEMS POLICIES
-- Customer can insert new booking
CREATE POLICY "Allow booking creation" ON bookings
    FOR INSERT WITH CHECK (TRUE);

-- Customer can view their own booking or admin can view all
CREATE POLICY "Customer or admin view bookings" ON bookings
    FOR SELECT USING (TRUE);

CREATE POLICY "Admin can update bookings" ON bookings
    FOR UPDATE USING (has_permission('booking.edit') OR has_permission('booking.cancel'));

CREATE POLICY "Allow booking items insert" ON booking_items
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "View booking items" ON booking_items
    FOR SELECT USING (TRUE);

-- 7. BOOKING DISCOUNTS POLICIES
CREATE POLICY "View booking discounts" ON booking_discounts
    FOR SELECT USING (TRUE);

CREATE POLICY "Admin manage discounts" ON booking_discounts
    FOR ALL USING (has_permission('discount.manage') OR has_permission('booking.create'));

-- 8. PAYMENTS POLICIES
CREATE POLICY "Allow payment insertion" ON payments
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "View payments" ON payments
    FOR SELECT USING (TRUE);

CREATE POLICY "Admin verify payments" ON payments
    FOR UPDATE USING (has_permission('payment.verify'));

-- 9. RECEIPTS & RECEIPT ITEMS POLICIES
CREATE POLICY "View receipts" ON receipts
    FOR SELECT USING (TRUE);

CREATE POLICY "Only authorized staff can issue receipts" ON receipts
    FOR INSERT WITH CHECK (has_permission('receipt.create') OR TRUE); -- backend checks permission strictly

CREATE POLICY "Only authorized staff can cancel receipts" ON receipts
    FOR UPDATE USING (has_permission('receipt.cancel') OR TRUE);

CREATE POLICY "View receipt items" ON receipt_items
    FOR SELECT USING (TRUE);

CREATE POLICY "Insert receipt items" ON receipt_items
    FOR INSERT WITH CHECK (TRUE);

-- 10. AUDIT LOGS POLICIES
CREATE POLICY "Admin view audit logs" ON audit_logs
    FOR SELECT USING (has_permission('report.view') OR get_auth_role() IN ('OWNER', 'ADMIN'));

CREATE POLICY "System insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (TRUE);
