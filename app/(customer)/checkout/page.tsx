'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiff } from '@/components/providers/LiffProvider';
import { Room, Promotion, Settings } from '@/types/database';
import { calculateNights, formatCurrency, formatDateThai } from '@/lib/formatters';
import { calculateBookingPrices } from '@/lib/pricing';
import {
  Calendar,
  Users,
  ShieldCheck,
  Tag,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, customer, setManualCustomer } = useLiff();

  const roomId = searchParams.get('roomId');
  const checkInDate = searchParams.get('checkIn') || '';
  const checkOutDate = searchParams.get('checkOut') || '';
  const numGuests = parseInt(searchParams.get('guests') || '1', 10);

  const [room, setRoom] = useState<Room | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-populate from LIFF
  useEffect(() => {
    if (customer) {
      setFullName(customer.full_name || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
    } else if (profile) {
      setFullName(profile.displayName || '');
      setEmail(profile.email || '');
    }
  }, [customer, profile]);

  // Fetch Room & Settings
  useEffect(() => {
    if (!roomId) return;

    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.room) {
          setRoom(d.room);
        }
      })
      .catch(() => {});

    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});

    fetch('/api/promotions?activeOnly=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.promotions) {
          setActivePromotions(d.promotions);
        }
      })
      .catch(() => {});
  }, [roomId]);

  const nights = calculateNights(checkInDate, checkOutDate);

  // Calculate pricing breakdown
  const priceBreakdown = room
    ? calculateBookingPrices({
        pricePerNight: Number(room.price_per_night),
        nights,
        checkInDate,
        checkOutDate,
        room,
        promotion: appliedPromo,
      })
    : null;

  // Handle promo code apply
  const handleApplyPromo = () => {
    setPromoError(null);
    if (!promoCodeInput.trim()) return;

    const matched = activePromotions.find(
      (p) => p.code.toUpperCase() === promoCodeInput.trim().toUpperCase()
    );

    if (!matched) {
      setPromoError('ไม่พบโค้ดโปรโมชั่นนี้ หรือโปรโมชั่นหมดอายุแล้ว');
      setAppliedPromo(null);
      return;
    }

    if (nights < matched.min_nights) {
      setPromoError(`โปรโมชั่นนี้ต้องเข้าพักอย่างน้อย ${matched.min_nights} คืน`);
      setAppliedPromo(null);
      return;
    }

    setAppliedPromo(matched);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError(null);
  };

  // Submit Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !checkInDate || !checkOutDate) return;

    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุล และเบอร์โทรศัพท์');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Create or sync customer
      const authRes = await fetch('/api/auth/liff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: profile?.userId || `web-${Date.now()}`,
          displayName: fullName,
          fullName,
          phone,
          email,
        }),
      });
      const authData = await authRes.json();
      const customerId = authData.customerId || customer?.id;

      if (authData.customer) {
        setManualCustomer(authData.customer);
      }

      // 2. Atomic create booking
      const bookRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          customerName: fullName,
          customerPhone: phone,
          customerEmail: email,
          roomId: room.id,
          checkInDate,
          checkOutDate,
          numGuests,
          promotionCode: appliedPromo?.code,
          notes: specialRequests,
          actorId: customerId,
          actorName: fullName,
        }),
      });

      const bookData = await bookRes.json();

      if (!bookData.success) {
        setErrorMsg(bookData.error || 'Failed to create booking');
        setIsSubmitting(false);
        return;
      }

      // Confetti effect
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      // Redirect to Booking Voucher page
      router.push(`/bookings/${bookData.booking.id}`);
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setIsSubmitting(false);
    }
  };

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-resort-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-4">กำลังโหลดข้อมูลห้องพัก...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ยืนยันการจองห้องพัก
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          กรุณาตรวจสอบรายละเอียดห้องพักและข้อมูลผู้เข้าพักก่อนทำการจอง
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">เกิดข้อผิดพลาด</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Guest Info & Stay Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Guest Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-4 h-4 text-resort-600" />
              <span>ข้อมูลผู้เข้าพักหลัก</span>
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="081-234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    อีเมล (สำหรับรับใบจอง)
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำขอพิเศษ (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ขอเตียงใหญ่, เดินทางถึงช่วงเย็น"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Promotion Code Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-resort-600" />
              <span>โค้ดส่วนลด & โปรโมชั่น</span>
            </h2>

            {appliedPromo ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-xs font-bold text-green-900">
                      ใช้โปรโมชั่น: {appliedPromo.code}
                    </div>
                    <div className="text-[11px] text-green-700">
                      {appliedPromo.name} (ประหยัด {formatCurrency(priceBreakdown?.promotionDiscount)})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-xs font-bold text-red-600 hover:text-red-800"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="กรอกโค้ดส่วนลด เช่น EARLYBIRD"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    ใช้โค้ด
                  </button>
                </div>
                {promoError && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{promoError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary & Price Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4 sticky top-20">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-resort-600" />
              <span>สรุปรายการจอง</span>
            </h2>

            {/* Room mini card */}
            <div className="flex gap-3 items-center">
              <img
                src={
                  room.room_images?.[0]?.image_url ||
                  room.room_type?.cover_image ||
                  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&auto=format&fit=crop&q=80'
                }
                alt={room.room_name}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
              <div>
                <span className="text-[10px] font-bold text-resort-600 bg-resort-50 px-1.5 py-0.5 rounded">
                  ห้อง {room.room_number}
                </span>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">
                  {room.room_name}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>ผู้เข้าพัก: {numGuests} ท่าน</span>
                </div>
              </div>
            </div>

            {/* Stay Dates Box */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">เช็คอิน (Check-in):</span>
                <span className="font-bold text-slate-800">{formatDateThai(checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เช็คเอาท์ (Check-out):</span>
                <span className="font-bold text-slate-800">{formatDateThai(checkOutDate)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">จำนวนคืน:</span>
                <span className="font-bold text-resort-700">{nights} คืน</span>
              </div>
            </div>

            {/* Price Calculations (Formula enforced) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>ราคาห้องพัก ({nights} คืน):</span>
                <span className="font-medium">{formatCurrency(priceBreakdown?.subtotalAmount)}</span>
              </div>

              {priceBreakdown && priceBreakdown.promotionDiscount > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>ส่วนลดโปรโมชั่น:</span>
                  <span>-{formatCurrency(priceBreakdown.promotionDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-900 font-extrabold text-base pt-2 border-t border-slate-200">
                <span>ยอดสุทธิ (Net Total):</span>
                <span className="text-resort-700">{formatCurrency(priceBreakdown?.netTotal)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-resort-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>ยืนยันการจองห้องพัก</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-resort-600" />
              <span>การจองปลอดภัย ข้อมูลถูกบันทึกทันที</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">กำลังโหลด...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
