import { Promotion, Room } from '@/types/database';
import { parseISO, eachDayOfInterval, subDays } from 'date-fns';

export interface PriceBreakdown {
  pricePerNight: number;
  totalNights: number;
  subtotalAmount: number;
  promotionDiscount: number;
  appliedPromotion?: Promotion | null;
  manualDiscount: number;
  netTotal: number;
  paidAmount: number;
  remainingBalance: number;
}

export function calculatePromotionDiscount(
  subtotalAmount: number,
  nights: number,
  checkInDate: string,
  checkOutDate: string,
  room: Room,
  promotion?: Promotion | null
): { discountAmount: number; applied: boolean; reason?: string } {
  if (!promotion || !promotion.is_active) {
    return { discountAmount: 0, applied: false, reason: 'No active promotion' };
  }

  // 1. Check Date Range
  const promoStart = promotion.start_date;
  const promoEnd = promotion.end_date;
  if (checkInDate < promoStart || checkInDate > promoEnd) {
    return { discountAmount: 0, applied: false, reason: 'Booking date is outside promotion validity' };
  }

  // 2. Check Min Nights
  if (nights < (promotion.min_nights || 1)) {
    return {
      discountAmount: 0,
      applied: false,
      reason: `Minimum ${promotion.min_nights} nights required for this promotion`,
    };
  }

  // 3. Check Applicable Room Type
  if (promotion.applicable_room_type_id && promotion.applicable_room_type_id !== room.room_type_id) {
    return {
      discountAmount: 0,
      applied: false,
      reason: 'Promotion is not applicable to this room type',
    };
  }

  // 4. Check Day of Week (if configured)
  if (promotion.applicable_days_of_week && promotion.applicable_days_of_week.length > 0) {
    try {
      const checkIn = parseISO(checkInDate);
      const checkOut = parseISO(checkOutDate);
      // days of stay (excluding checkout day)
      const stayDays = eachDayOfInterval({ start: checkIn, end: subDays(checkOut, 1) });
      const matchesAnyDay = stayDays.some((d) =>
        promotion.applicable_days_of_week?.includes(d.getDay())
      );
      if (!matchesAnyDay) {
        return {
          discountAmount: 0,
          applied: false,
          reason: 'Promotion does not match stay days of the week',
        };
      }
    } catch {
      // ignore parse errors and proceed
    }
  }

  // 5. Calculate Discount
  let discount = 0;
  if (promotion.discount_type === 'PERCENTAGE') {
    discount = (subtotalAmount * Number(promotion.discount_value)) / 100;
  } else if (promotion.discount_type === 'FIXED_AMOUNT') {
    discount = Number(promotion.discount_value);
  }

  // Discount cannot exceed subtotal
  discount = Math.min(discount, subtotalAmount);
  discount = Math.max(0, Math.round(discount * 100) / 100);

  return { discountAmount: discount, applied: true };
}

export function calculateBookingPrices(params: {
  pricePerNight: number;
  nights: number;
  checkInDate: string;
  checkOutDate: string;
  room: Room;
  promotion?: Promotion | null;
  manualDiscountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | null;
  manualDiscountValue?: number | null;
  paidAmount?: number;
}): PriceBreakdown {
  const {
    pricePerNight,
    nights,
    checkInDate,
    checkOutDate,
    room,
    promotion,
    manualDiscountType,
    manualDiscountValue,
    paidAmount = 0,
  } = params;

  const validNights = Math.max(1, nights);
  const subtotalAmount = Math.round(pricePerNight * validNights * 100) / 100;

  // 1. Promotion Discount
  const promoResult = calculatePromotionDiscount(
    subtotalAmount,
    validNights,
    checkInDate,
    checkOutDate,
    room,
    promotion
  );
  const promotionDiscount = promoResult.applied ? promoResult.discountAmount : 0;

  // 2. Manual Discount
  let manualDiscount = 0;
  const afterPromo = Math.max(0, subtotalAmount - promotionDiscount);

  if (manualDiscountValue && manualDiscountValue > 0) {
    if (manualDiscountType === 'PERCENTAGE') {
      manualDiscount = (afterPromo * Number(manualDiscountValue)) / 100;
    } else {
      manualDiscount = Number(manualDiscountValue);
    }
    manualDiscount = Math.min(manualDiscount, afterPromo);
    manualDiscount = Math.max(0, Math.round(manualDiscount * 100) / 100);
  }

  // 3. Net Total
  const netTotal = Math.max(0, Math.round((afterPromo - manualDiscount) * 100) / 100);

  // 4. Paid Amount & Remaining Balance
  const roundedPaid = Math.max(0, Math.round(paidAmount * 100) / 100);
  const remainingBalance = Math.max(0, Math.round((netTotal - roundedPaid) * 100) / 100);

  return {
    pricePerNight,
    totalNights: validNights,
    subtotalAmount,
    promotionDiscount,
    appliedPromotion: promoResult.applied ? promotion : null,
    manualDiscount,
    netTotal,
    paidAmount: roundedPaid,
    remainingBalance,
  };
}
