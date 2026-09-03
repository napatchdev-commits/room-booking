'use client';

import React, { useState, useEffect } from 'react';
import { Room } from '@/types/database';
import { formatCurrency, formatDateThai } from '@/lib/formatters';
import { format, addDays } from 'date-fns';
import {
  X,
  UserCheck,
  BedDouble,
  Calendar,
  CreditCard,
  DollarSign,
  Receipt as ReceiptIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Phone,
  User,
  Sparkles,
} from 'lucide-react';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (booking: any) => void;
  initialRoomId?: string;
  initialDate?: string;
}

export function WalkInModal({
  isOpen,
  onClose,
  onSuccess,
  initialRoomId,
  initialDate,
}: WalkInModalProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultCheckIn = initialDate || todayStr;
  const defaultCheckOut = format(addDays(new Date(defaultCheckIn), 1), 'yyyy-MM-dd');

  const [checkInDate, setCheckInDate] = useState(defaultCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOut);
  const [numGuests, setNumGuests] = useState(2);

  // Available rooms for selected dates
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Guest details
  const [guestName, setGuestName] = useState('ลูกค้า Walk-in');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestTaxId, setGuestTaxId] = useState('');

  // Pricing & Payment
  const [pricePerNight, setPricePerNight] = useState<number>(1500);
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PROMPTPAY_QR' | 'BANK_TRANSFER' | 'PAY_LATER'>('CASH');
  const [isPaidFull, setIsPaidFull] = useState(true);
  const [customPaidAmount, setCustomPaidAmount] = useState<number>(0);
  const [autoIssueReceipt, setAutoIssueReceipt] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<'CHECKED_IN' | 'CONFIRMED'>('CHECKED_IN');
  const [notes, setNotes] = useState('');

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  // Sync initial props
  useEffect(() => {
    if (initialDate) {
      setCheckInDate(initialDate);
      setCheckOutDate(format(addDays(new Date(initialDate), 1), 'yyyy-MM-dd'));
    }
  }, [initialDate]);

  // Fetch available rooms when dates change
  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailableRooms = async () => {
      setIsLoadingRooms(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/rooms/available?checkIn=${checkInDate}&checkOut=${checkOutDate}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
          setAvailableRooms(data.rooms);
          if (data.rooms.length > 0) {
            const initialMatch = initialRoomId && data.rooms.some((r: Room) => r.id === initialRoomId)
              ? initialRoomId
              : data.rooms[0].id;
            setSelectedRoomId(initialMatch);

            const matchedRoom = data.rooms.find((r: Room) => r.id === initialMatch);
            if (matchedRoom) {
              setPricePerNight(Number(matchedRoom.price_per_night || 1500));
            }
          } else {
            setSelectedRoomId('');
          }
        }
      } catch (err) {
        console.error('Failed to load available rooms:', err);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchAvailableRooms();
  }, [isOpen, checkInDate, checkOutDate, initialRoomId]);

  // Update price when selected room changes
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = availableRooms.find((r) => r.id === roomId);
    if (room) {
      setPricePerNight(Number(room.price_per_night || 1500));
    }
  };

  // Calculate calculations
  const calculateNightsCount = () => {
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const nights = calculateNightsCount();
  const subtotal = Math.round(pricePerNight * nights * 100) / 100;
  const netTotal = Math.max(0, Math.round((subtotal - Number(manualDiscount || 0)) * 100) / 100);
  const effectivePaidAmount = paymentMethod === 'PAY_LATER' ? 0 : isPaidFull ? netTotal : Number(customPaidAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setErrorMsg('กรุณาเลือกห้องพักที่ต้องการเช็คอิน');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isWalkIn: true,
          roomId: selectedRoomId,
          customerName: guestName.trim() || 'ลูกค้า Walk-in',
          customerPhone: guestPhone.trim() || '080-000-0000',
          customerTaxId: guestTaxId.trim() || null,
          checkInDate,
          checkOutDate,
          numGuests,
          customPricePerNight: pricePerNight,
          manualDiscount: Number(manualDiscount || 0),
          paidAmount: effectivePaidAmount,
          paymentMethod,
          autoIssueReceipt,
          status: bookingStatus,
          notes: notes.trim() || `ลูกค้า Walk-in ชำระผ่าน ${paymentMethod}`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to create Walk-in booking');
        setIsSubmitting(false);
        return;
      }

      setSuccessBooking(data.booking);
      if (onSuccess) {
        onSuccess(data.booking);
      }
    } catch (err) {
      console.error('Walk-in booking submit error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-resort-900 to-resort-800 text-white rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-inner">
              <UserCheck className="w-5 h-5 text-resort-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">รับลูกค้า Walk-in (Check-in หน้าร้าน)</h2>
              <p className="text-xs text-resort-200">
                บันทึกการเข้าพัก ชำระเงินสด/โอน และล็อกห้องพักทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {successBooking ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">เช็คอินลูกค้า Walk-in สำเร็จ!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  เลขที่การจอง: <span className="font-bold text-resort-700">{successBooking.booking_number}</span>
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-left max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">ห้องพัก:</span>
                  <span className="font-bold text-slate-900">
                    {(successBooking.booking_items || []).map((it: any) => `${it.room_name} (${it.room_number})`).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ผู้เข้าพัก:</span>
                  <span className="font-bold text-slate-900">{successBooking.customer?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดเงินสุทธิ:</span>
                  <span className="font-black text-slate-900">{formatCurrency(successBooking.net_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ชำระแล้ว:</span>
                  <span className="font-extrabold text-emerald-700">{formatCurrency(successBooking.paid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานะ:</span>
                  <span className="font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-[10px]">
                    {successBooking.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={`/receipts/${successBooking.id}`}
                  target="_blank"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <ReceiptIcon className="w-3.5 h-3.5" />
                  <span>ดู / พิมพ์ใบเสร็จ</span>
                </a>
                <a
                  href={`/bookings/${successBooking.id}`}
                  target="_blank"
                  className="px-4 py-2 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  <span>ดูใบจองห้องพัก</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Date Selector */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-resort-600" />
                  <span>1. วันที่เข้าพัก (Stay Dates)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">วันเช็คอิน</label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">วันเช็คเอาท์</label>
                    <input
                      type="date"
                      min={checkInDate}
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  ระยะเวลา: <span className="font-bold text-slate-900">{nights} คืน</span>
                </div>
              </div>

              {/* 2. Room Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 text-resort-600" />
                    <span>2. เลือกห้องพักที่ว่าง *</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {isLoadingRooms ? 'กำลังตรวจสอบห้องว่าง...' : `ว่าง ${availableRooms.length} ห้อง`}
                  </span>
                </label>

                {availableRooms.length === 0 && !isLoadingRooms ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold text-center">
                    ❌ ไม่มีห้องว่างสำหรับวันที่เลือก (ห้องเต็มทุกห้อง)
                  </div>
                ) : (
                  <select
                    value={selectedRoomId}
                    onChange={(e) => handleRoomSelect(e.target.value)}
                    required
                    disabled={isLoadingRooms}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                  >
                    {availableRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.room_name} (ห้อง {room.room_number}) — {room.room_type?.name || 'Standard'} (฿{Number(room.price_per_night).toLocaleString()}/คืน)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. Guest Information */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-resort-600" />
                  <span>3. ข้อมูลลูกค้า Walk-in</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">ชื่อ-นามสกุล *</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="เช่น คุณสมบัติ สมใจดี"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">เบอร์โทรศัพท์</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="08x-xxx-xxxx"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">จำนวนผู้เข้าพัก (ท่าน)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={numGuests}
                      onChange={(e) => setNumGuests(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">เลขประจำตัวผู้เสียภาษี / บัตร ปชช.</label>
                    <input
                      type="text"
                      value={guestTaxId}
                      onChange={(e) => setGuestTaxId(e.target.value)}
                      placeholder="ระบุถ้าต้องการออกใบกำกับ"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Pricing & Payment */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-resort-600" />
                  <span>4. ราคาและการชำระเงินหน้าร้าน</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">ราคาต่อคืน (บาท)</label>
                    <input
                      type="number"
                      value={pricePerNight}
                      onChange={(e) => setPricePerNight(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">ส่วนลดพิเศษ Walk-in (บาท)</label>
                    <input
                      type="number"
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-resort-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">ยอดรวมสุทธิ:</span>
                  <span className="text-base font-black text-resort-700">{formatCurrency(netTotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">ช่องทางชำระเงิน</label>
                    <select
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    >
                      <option value="CASH">💵 เงินสด (CASH)</option>
                      <option value="PROMPTPAY_QR">📲 สแกนพร้อมเพย์ (QR)</option>
                      <option value="BANK_TRANSFER">🏦 โอนเงินผ่านธนาคาร</option>
                      <option value="PAY_LATER">⏳ ชำระตอนเช็คเอาท์</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">สถานะการเข้าพัก</label>
                    <select
                      value={bookingStatus}
                      onChange={(e: any) => setBookingStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    >
                      <option value="CHECKED_IN">🟢 เข้าพักทันที (CHECKED_IN)</option>
                      <option value="CONFIRMED">🟡 จองล่วงหน้า (CONFIRMED)</option>
                    </select>
                  </div>
                </div>

                {/* Auto Receipt Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoReceipt"
                    checked={autoIssueReceipt}
                    onChange={(e) => setAutoIssueReceipt(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="autoReceipt" className="text-xs font-bold text-slate-700 cursor-pointer">
                    ออกใบเสร็จรับเงินรันเลขอัตโนมัติ (SC26-XXX) ทันที
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableRooms.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>ยืนยันรับลูกค้า Walk-in & เช็คอิน</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
