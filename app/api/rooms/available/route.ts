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
    const guestsParam = searchParams.get('guests');
    const guests = guestsParam ? parseInt(guestsParam, 10) : 1;
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
    const bookedRoomIds = new Set<string>();
    try {
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('id, booking_items(room_id)')
        .in('status', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn);

      conflictingBookings?.forEach((b: any) => {
        if (Array.isArray(b.booking_items)) {
          b.booking_items.forEach((item: any) => {
            if (item?.room_id) bookedRoomIds.add(item.room_id);
          });
        } else if (b.booking_items?.room_id) {
          bookedRoomIds.add(b.booking_items.room_id);
        }
      });
    } catch (bErr) {
      console.warn('Could not query conflicting bookings, proceeding with room list:', bErr);
    }

    // 2. Fetch all active promotions
    let promotions: Promotion[] = [];
    try {
      const { data: promoData } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', checkIn)
        .gte('end_date', checkIn);

      if (promoData) promotions = promoData as Promotion[];
    } catch {
      // ignore
    }

    // 3. Fetch rooms with capacity check
    let roomQuery = supabase
      .from('rooms')
      .select('*, room_type:room_types(*), room_images(*)')
      .order('price_per_night', { ascending: true });

    // Filter out maintenance rooms
    roomQuery = roomQuery.neq('status', 'maintenance');

    // Filter by capacity if specified
    if (guests && guests > 0) {
      roomQuery = roomQuery.gte('capacity', guests);
    }

    // Filter by room type if specified
    if (roomTypeId) {
      roomQuery = roomQuery.eq('room_type_id', roomTypeId);
    }

    const { data: rooms, error: roomErr } = await roomQuery;

    if (roomErr) {
      console.error('Error fetching rooms:', roomErr);
      return NextResponse.json({ error: roomErr.message || 'Failed to fetch rooms' }, { status: 500 });
    }

    // Filter out booked rooms
    const availableRooms = (rooms || []).filter((room) => !bookedRoomIds.has(room.id));

    // Calculate price breakdown with promotions for each room
    const roomsWithPricing = availableRooms.map((room) => {
      const pricePerNight = Number(room.price_per_night || 0);
      const subtotal = pricePerNight * nights;

      // Find best applicable promotion
      let bestDiscount = 0;
      let appliedPromo: Promotion | null = null;

      promotions.forEach((promo) => {
        try {
          const result = calculatePromotionDiscount(
            subtotal,
            nights,
            checkIn,
            checkOut,
            room as unknown as Room,
            promo
          );
          if (result.applied && result.discountAmount > bestDiscount) {
            bestDiscount = result.discountAmount;
            appliedPromo = promo;
          }
        } catch {
          // ignore
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
  } catch (error: any) {
    console.error('Available rooms error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
