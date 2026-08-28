import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { calculateNights } from '@/lib/formatters';
import { calculatePromotionDiscount } from '@/lib/pricing';
import { Promotion, Room } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const guests = parseInt(searchParams.get('guests') || '1', 10);
    const roomTypeId = searchParams.get('roomTypeId');

    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: 'checkIn and checkOut dates are required' }, { status: 400 });
    }

    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
      return NextResponse.json({ error: 'Check-out date must be after Check-in date' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Find conflicting bookings
    const { data: conflictingBookings, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, booking_items(room_id)')
      .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
      .lt('check_in_date', checkOut)
      .gt('check_out_date', checkIn);

    if (bookingErr) {
      console.error('Error fetching conflicting bookings:', bookingErr);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Collect all booked room IDs
    const bookedRoomIds = new Set<string>();
    conflictingBookings?.forEach((b) => {
      (b.booking_items as unknown as { room_id: string }[])?.forEach((item) => {
        if (item.room_id) bookedRoomIds.add(item.room_id);
      });
    });

    // 2. Fetch all active promotions
    const { data: promotions } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', checkIn)
      .gte('end_date', checkIn);

    // 3. Fetch rooms that are available
    let roomQuery = supabase
      .from('rooms')
      .select('*, room_type:room_types(*), room_images(*)')
      .neq('status', 'maintenance')
      .gte('capacity', guests);

    if (roomTypeId) {
      roomQuery = roomQuery.eq('room_type_id', roomTypeId);
    }

    const { data: rooms, error: roomErr } = await roomQuery.order('price_per_night', { ascending: true });

    if (roomErr) {
      console.error('Error fetching rooms:', roomErr);
      return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
    }

    // Filter out booked rooms
    const availableRooms = (rooms || []).filter((room) => !bookedRoomIds.has(room.id));

    // Calculate price breakdown with promotions for each room
    const roomsWithPricing = availableRooms.map((room) => {
      const pricePerNight = Number(room.price_per_night);
      const subtotal = pricePerNight * nights;

      // Find best applicable promotion
      let bestDiscount = 0;
      let appliedPromo: Promotion | null = null;

      (promotions || []).forEach((promo) => {
        const result = calculatePromotionDiscount(
          subtotal,
          nights,
          checkIn,
          checkOut,
          room as unknown as Room,
          promo as unknown as Promotion
        );
        if (result.applied && result.discountAmount > bestDiscount) {
          bestDiscount = result.discountAmount;
          appliedPromo = promo as unknown as Promotion;
        }
      });

      const netTotal = Math.max(0, subtotal - bestDiscount);
      const discountedPricePerNight = Math.round((netTotal / nights) * 100) / 100;

      return {
        ...room,
        pricing: {
          nights,
          originalPricePerNight: pricePerNight,
          originalSubtotal: subtotal,
          discountAmount: bestDiscount,
          netTotal,
          discountedPricePerNight,
          appliedPromotion: appliedPromo,
          hasDiscount: bestDiscount > 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      checkIn,
      checkOut,
      nights,
      guests,
      count: roomsWithPricing.length,
      rooms: roomsWithPricing,
    });
  } catch (error) {
    console.error('Available rooms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
