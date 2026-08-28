import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import { calculateNights } from '@/lib/formatters';
import { calculatePromotionDiscount } from '@/lib/pricing';
import { Promotion, Room } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkIn = searchParams.get('checkIn') || '';
    const checkOut = searchParams.get('checkOut') || '';
    const guestsParam = searchParams.get('guests');
    const guests = guestsParam ? parseInt(guestsParam, 10) : 1;
    const roomTypeId = searchParams.get('roomTypeId');

    const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 1;
    const validNights = Math.max(1, nights);

    const supabase = getAdminClient();

    // 1. Find conflicting bookings
    const bookedRoomIds = new Set<string>();
    if (checkIn && checkOut) {
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
              if (item?.room_id) bookedRoomIds.add(String(item.room_id));
            });
          } else if (b.booking_items?.room_id) {
            bookedRoomIds.add(String(b.booking_items.room_id));
          }
        });
      } catch (bErr) {
        console.warn('Could not query conflicting bookings:', bErr);
      }
    }

    // 2. Fetch all active promotions
    let promotions: Promotion[] = [];
    try {
      const { data: promoData } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true);

      if (promoData) promotions = promoData as Promotion[];
    } catch {
      // ignore
    }

    // 3. Fetch all rooms
    const { data: allRooms, error: roomErr } = await supabase
      .from('rooms')
      .select('*, room_type:room_types(*), room_images(*)')
      .order('room_number', { ascending: true });

    if (roomErr) {
      console.error('Error fetching rooms:', roomErr);
      return NextResponse.json({ error: roomErr.message || 'Failed to fetch rooms' }, { status: 500 });
    }

    // 4. Filter in JavaScript for bulletproof reliability
    const availableRooms = (allRooms || []).filter((room: any) => {
      // Filter out maintenance
      if (room.status === 'maintenance') return false;

      // Filter by capacity (default to 2 if missing, allow if capacity >= requested guests)
      const roomCapacity = Number(room.capacity || 2);
      if (guests && roomCapacity < guests) return false;

      // Filter by roomTypeId if specified
      if (roomTypeId && roomTypeId !== 'ALL' && room.room_type_id !== roomTypeId) return false;

      // Filter out booked rooms
      if (bookedRoomIds.has(String(room.id))) return false;

      return true;
    });

    // 5. Calculate price breakdown with promotions for each room
    const roomsWithPricing = availableRooms.map((room: any) => {
      const pricePerNight = Number(room.price_per_night || 0);
      const subtotal = pricePerNight * validNights;

      // Find best applicable promotion
      let bestDiscount = 0;
      let appliedPromo: Promotion | null = null;

      if (checkIn && checkOut) {
        promotions.forEach((promo) => {
          try {
            const result = calculatePromotionDiscount(
              subtotal,
              validNights,
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
      }

      const netTotal = Math.max(0, subtotal - bestDiscount);
      const discountedPricePerNight = Math.round((netTotal / validNights) * 100) / 100;

      return {
        ...room,
        pricing: {
          nights: validNights,
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
      nights: validNights,
      guests,
      count: roomsWithPricing.length,
      rooms: roomsWithPricing,
    });
  } catch (error: any) {
    console.error('Available rooms error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
