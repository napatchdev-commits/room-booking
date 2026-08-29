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
  Phone,
  User,
  Mail,
  Loader2,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import confetti from 'canvas-confetti';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, customer, setManualCustomer } = useLiff();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultCheckOutStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const roomId = searchParams.get('roomId');
  const checkInDate = searchParams.get('checkIn') || todayStr;
  const checkOutDate = searchParams.get('checkOut') || defaultCheckOutStr;
  const numGuests = parseInt(searchParams.get('guests') || '2', 10);

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

  // Auto-populate from LIFF profile
  useEffect(() => {
    if (customer) {
      if (customer.full_name && !fullName) setFullName(customer.full_name);
      if (customer.phone && !phone) setPhone(customer.phone);
      if (customer.email && !email) setEmail(customer.email);
    } else if (profile) {
      if (profile.displayName && !fullName) setFullName(profile.displayName);
      if (profile.email && !email) setEmail(profile.email);
    }
  }, [customer, profile, fullName, phone, email]);

  // Fetch Room & Settings
  useEffect(() => {
    if (!roomId) return;

    fetch(`/api/rooms/${roomId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.room) {
          setRoom(d.room);
        }
      })
      .catch(() => {});

    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});

    fetch('/api/promotions?activeOnly=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.promotions) {
          setActivePromotions(d.promotions);
        }
      })
      .catch(() => {});
  }, [roomId]);

  const nights = Math.max(1, calculateNights(checkInDate, checkOutDate));

  // Calculate pricing breakdown
  const priceBreakdown = room
    ? calculateBookingPrices({
        pricePerNight: Number(room.price_per_night || 0),
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
    if (!room) return;

    const effectiveName = fullName.trim() || profile?.displayName || 'ลูกค้าผู้เข้าพัก';
    const effectivePhone = phone.trim() || '080-000-0000';

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Create or sync customer with LINE profile
      let customerId = customer?.id;
      try {
        const authRes = await fetch('/api/auth/liff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId: profile?.userId || `web-${Date.now()}`,
            displayName: effectiveName,
            fullName: effectiveName,
            phone: effectivePhone,
            email: email.trim() || profile?.email || '',
            pictureUrl: profile?.pictureUrl,
          }),
        });
        const authData = await authRes.json();
        if (authData.customerId) {
          customerId = authData.customerId;
        }
        if (authData.customer) {
          setManualCustomer(authData.customer);
        }
      } catch (authErr) {
        console.warn('LIFF sync skipped:', authErr);
      }

      // 2. Create Booking in database
      const bookRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          customerName: effectiveName,
          customerPhone: effectivePhone,
          customerEmail: email.trim(),
          roomId: room.id,
          checkInDate,
          checkOutDate,
          numGuests,
          promotionCode: appliedPromo?.code,
          notes: specialRequests.trim(),
          actorId: customerId,
          actorName: effectiveName,
        }),
      });

      const bookData = await bookRes.json();

      if (!bookData.success || !bookData.booking?.id) {
        setErrorMsg(bookData.error || 'ไม่สามารถทำการจองได้ กรุณาลองใหม่อีกครั้ง');
        setIsSubmitting(false);
        return;
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      // Redirect immediately to Payment page
      router.push(`/bookings/${bookData.booking.id}/payment`);
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
      setIsSubmitting(false);
    }
  };

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-resort-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-4">กำลังโหลดข้อมูลห้องพัก...</p>
      </div>
    );
  }

  const netTotal = priceBreakdown?.netTotal || Number(room.price_per_night) * nights;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 pb-28 md:pb-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ยืนยันการจองห้องพัก
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          กรุณาตรวจสอบรายละเอียดห้องพักและข้อมูลผู้เข้าพักก่อนทำการยืนยันการจอง
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-start gap-2.5 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">เกิดข้อผิดพลาดในการจอง</div>
            <div className="mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleCreateBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Guest Info & Stay Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Guest Information Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-4 h-4 text-resort-600" />
              <span>ข้อมูลผู้เข้าพักหลัก</span>
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-resort-600" />
                  <span>ชื่อ-นามสกุล ผู้เข้าพัก *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมบัติ นามสกุล"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-resort-600" />
                    <span>เบอร์โทรศัพท์มือถือ *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="081-xxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-resort-600" />
                    <span>อีเมล (ถ้ามี)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำขอพิเศษเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ขอเตียงเสริม, เดินทางถึงช่วงค่ำ..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-resort-500/20 focus:border-resort-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Promotion Code Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-resort-600" />
              <span>โค้ดส่วนลด & โปรโมชั่น</span>
            </h2>

            {appliedPromo ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
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
                  className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 bg-white rounded-lg border border-red-200"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="กรอกโค้ดส่วนลด เช่น PROMO2026"
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
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4 sticky top-20">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-resort-600" />
              <span>สรุปรายการจองห้องพัก</span>
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
                className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 shadow-sm border border-slate-200"
              />
              <div>
                <span className="text-[10px] font-bold text-resort-700 bg-resort-50 px-2 py-0.5 rounded-md">
                  ห้อง {room.room_number} ({room.room_type?.name || 'Standard'})
                </span>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mt-1">
                  {room.room_name}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-resort-600" />
                  <span>ผู้เข้าพัก: {numGuests} ท่าน</span>
                </div>
              </div>
            </div>

            {/* Stay Dates Box */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">วันเช็คอิน (Check-in):</span>
                <span className="font-bold text-slate-800">{formatDateThai(checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วันเช็คเอาท์ (Check-out):</span>
                <span className="font-bold text-slate-800">{formatDateThai(checkOutDate)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200">
                <span className="text-slate-500">ระยะเวลาเข้าพัก:</span>
                <span className="font-bold text-resort-700">{nights} คืน</span>
              </div>
            </div>

            {/* Price Calculations */}
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
                <span className="text-resort-700 text-lg">{formatCurrency(netTotal)}</span>
              </div>
            </div>

            {/* Desktop Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-resort-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกการจอง...</span>
                </>
              ) : (
                <>
                  <span>ยืนยันการจองห้องพักทันที</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-resort-600" />
              <span>การจองปลอดภัย ข้อมูลถูกบันทึกลงระบบทันที</span>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Floating Confirm Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl md:hidden">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-slate-500">ยอดชำระ ({nights} คืน)</div>
              <div className="text-lg font-extrabold text-resort-700 leading-tight">
                {formatCurrency(netTotal)}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังจอง...</span>
                </>
              ) : (
                <>
                  <span>ยืนยันการจองห้องพัก</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
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
