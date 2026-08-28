-- ========================================================
-- 003_functions_and_triggers.sql
-- STORED FUNCTIONS, COLLISION DETECTION & ATOMIC BOOKING
-- ========================================================

-- 1. Helper function: Generate Booking Number (e.g. RES-20260828-0001)
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_val BIGINT;
    result_str TEXT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    seq_val := nextval('booking_number_seq');
    result_str := 'RES-' || today_str || '-' || LPAD(seq_val::TEXT, 4, '0');
    RETURN result_str;
END;
$$ LANGUAGE plpgsql;

-- 2. Helper function: Generate Receipt Number (e.g. RC-20260828-0001)
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_val BIGINT;
    result_str TEXT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYYYMMDD');
    seq_val := nextval('receipt_number_seq');
    result_str := 'RC-' || today_str || '-' || LPAD(seq_val::TEXT, 4, '0');
    RETURN result_str;
END;
$$ LANGUAGE plpgsql;

-- 3. Collision Prevention: Check if a room is available for specified dates
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
    -- Check room base status
    SELECT status INTO v_room_status FROM rooms WHERE id = p_room_id;
    IF v_room_status = 'maintenance' THEN
        RETURN FALSE;
    END IF;

    -- Overlap condition:
    -- A booking conflicts if it is NOT (check_out <= p_check_in OR check_in >= p_check_out)
    -- Which simplifies to: (b.check_in_date < p_check_out AND b.check_out_date > p_check_in)
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

-- 4. Atomic Booking Creation with DB-level Locking to prevent race conditions
CREATE OR REPLACE FUNCTION create_booking_atomic(
    p_customer_id UUID,
    p_room_id UUID,
    p_check_in DATE,
    p_check_out DATE,
    p_num_guests INT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_room RECORD;
    v_nights INT;
    v_subtotal NUMERIC(10,2);
    v_booking_id UUID;
    v_booking_number TEXT;
    v_available BOOLEAN;
BEGIN
    -- 1. Calculate nights
    v_nights := p_check_out - p_check_in;
    IF v_nights <= 0 THEN
        RAISE EXCEPTION 'Check-out date must be strictly after Check-in date';
    END IF;

    -- 2. Lock the room row to prevent concurrent race conditions
    SELECT * INTO v_room FROM rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found with ID: %', p_room_id;
    END IF;

    -- 3. Check availability
    v_available := is_room_available(p_room_id, p_check_in, p_check_out);
    IF NOT v_available THEN
        RAISE EXCEPTION 'Room is already booked or unavailable for the selected dates (Room %)', v_room.room_number;
    END IF;

    -- 4. Calculate pricing
    v_subtotal := v_room.price_per_night * v_nights;
    v_booking_number := generate_booking_number();
    v_booking_id := uuid_generate_v4();

    -- 5. Insert Booking
    INSERT INTO bookings (
        id,
        booking_number,
        customer_id,
        check_in_date,
        check_out_date,
        total_nights,
        num_guests,
        subtotal_amount,
        promotion_discount,
        manual_discount,
        net_total,
        paid_amount,
        remaining_balance,
        status,
        notes
    ) VALUES (
        v_booking_id,
        v_booking_number,
        p_customer_id,
        p_check_in,
        p_check_out,
        v_nights,
        p_num_guests,
        v_subtotal,
        0.00,
        0.00,
        v_subtotal,
        0.00,
        v_subtotal,
        'PENDING',
        p_notes
    );

    -- 6. Insert Booking Item (Snapshot)
    INSERT INTO booking_items (
        id,
        booking_id,
        room_id,
        room_name,
        room_number,
        price_per_night,
        nights,
        item_subtotal
    ) VALUES (
        uuid_generate_v4(),
        v_booking_id,
        v_room.id,
        v_room.room_name,
        v_room.room_number,
        v_room.price_per_night,
        v_nights,
        v_subtotal
    );

    -- Return created booking summary
    RETURN jsonb_build_object(
        'booking_id', v_booking_id,
        'booking_number', v_booking_number,
        'total_nights', v_nights,
        'subtotal_amount', v_subtotal,
        'net_total', v_subtotal,
        'status', 'PENDING'
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to recalculate Booking Paid Amount and Status upon Payment changes
CREATE OR REPLACE FUNCTION sync_booking_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(10,2);
    v_net_total NUMERIC(10,2);
    v_booking_id UUID;
BEGIN
    v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

    -- Calculate total verified payments
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_paid
    FROM payments
    WHERE booking_id = v_booking_id AND status = 'VERIFIED';

    -- Get net total of booking
    SELECT net_total INTO v_net_total FROM bookings WHERE id = v_booking_id;

    -- Update booking
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
