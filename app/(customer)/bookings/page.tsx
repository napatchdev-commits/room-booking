'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiff } from '@/components/providers/LiffProvider';
import { Booking } from '@/types/database';
import { formatCurrency, formatDateThai, formatPhone } from '@/lib/formatters';
import {
  BookOpenCheck,
  Calendar,
  CreditCard,
  ChevronRight,
  AlertCircle,
  FileText,
  Search,
  Lock,
  Phone,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export default function MyBookingsPage() {
  const { customer, profile, customerId, isLoggedIn, login } = useLiff();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. If customer is authenticated via LINE LIFF, automatically fetch their own bookings securely
  useEffect(() => {
    if (customerId) {
      fetchBookings(customerId, undefined);
    } else if (customer?.phone) {
      fetchBookings(undefined, customer.phone);
    } else {
      // Check if user previously searched phone in this session
      const savedPhone = typeof window !== 'undefined' ? sessionStorage.getItem('my_booking_phone') : null;
      if (savedPhone) {
        setPhoneSearch(savedPhone);
        fetchBookings(undefined, savedPhone);
      }
    }
  }, [customerId, customer]);

  const fetchBookings = async (cId?: string, search?: string) => {
    if (!cId && !search) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setSearchQuery(search || '');

    try {
      let url = '/api/bookings';
      if (cId) {
        url += `?customerId=${encodeURIComponent(cId)}`;
      } else if (search) {
        url += `?search=${encodeURIComponent(search.trim())}`;
      }

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
        if (search) {
          sessionStorage.setItem('my_booking_phone', search.trim());
        }
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneSearch.trim()) {
      fetchBookings(undefined, phoneSearch.trim());
    }
  };

  const handleClearSearch = () => {
    setPhoneSearch('');
    setHasSearched(false);
    setSearchQuery('');
    setBookings([]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('my_booking_phone');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">ยืนยันแล้ว</span>;
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">รอการชำระเงิน</span>;
      case 'CHECKED_IN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">เข้าพักอยู่</span>;
      case 'CHECKED_OUT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">เช็คเอาท์แล้ว</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">ยกเลิกแล้ว</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Title & Privacy Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpenCheck className="w-7 h-7 text-resort-600" />
            <span>การจองของฉัน (My Bookings)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ประวัติและสถานะการจองห้องพักเฉพาะบุคคลของคุณ
          </p>
        </div>

        {/* LINE User Badge or Switch Search */}
        {profile?.displayName ? (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            {profile.pictureUrl && (
              <img src={profile.pictureUrl} alt={profile.displayName} className="w-6 h-6 rounded-full" />
            )}
            <span className="font-bold text-slate-800">{profile.displayName}</span>
            <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full font-semibold">
              LINE Verified
            </span>
          </div>
        ) : hasSearched && (
          <button
            onClick={handleClearSearch}
            className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ค้นหาเบอร์อื่น</span>
          </button>
        )}
      </div>

      {/* When NOT logged in via LINE and hasn't searched yet -> Show Secure Private Search Portal */}
      {!customerId && !hasSearched && (
        <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-resort-50 text-resort-700 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">ตรวจสอบข้อมูลการจองของคุณ</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              เพื่อความปลอดภัยและความเป็นส่วนตัวของข้อมูลผู้เข้าพัก กรุณาระบุเบอร์โทรศัพท์ที่ใช้ในการจอง หรือเข้าสู่ระบบด้วย LINE
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="ระบุเบอร์โทรศัพท์ (เช่น 085-530-4890) หรือเลขใบจอง"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-resort-500/30 focus:border-resort-600 transition-all text-center sm:text-left"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-resort-700 hover:bg-resort-800 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>ค้นหาการจองของฉัน</span>
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">หรือ</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            onClick={login}
            className="w-full py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>เข้าสู่ระบบด้วย LINE เพื่อโหลดประวัติอัตโนมัติ</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 py-8">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {/* Search results: Empty Result State */}
      {!isLoading && hasSearched && bookings.length === 0 && (
        <div className="text-center py-14 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              ไม่พบประวัติการจองสำหรับข้อมูลนี้
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              คำค้นหา: &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo; กรุณาตรวจสอบเบอร์โทรหรือเลขที่ใบจองใหม่อีกครั้ง
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              ค้นหาใหม่อีกครั้ง
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-resort-700 hover:bg-resort-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              จองห้องพักใหม่
            </Link>
          </div>
        </div>
      )}

      {/* Bookings List Display (Only matching the verified customer) */}
      {!isLoading && bookings.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-500 px-1 flex items-center justify-between">
            <span>พบรายการจองของคุณทั้งหมด {bookings.length} รายการ</span>
            {searchQuery && (
              <span className="text-[11px] text-slate-400 font-normal">
                (ค้นหาด้วย: {searchQuery})
              </span>
            )}
          </div>

          {bookings.map((booking) => {
            const firstItem = booking.booking_items?.[0];
            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-resort-700 bg-resort-50 px-2 py-0.5 rounded border border-resort-200">
                      {booking.booking_number}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {firstItem?.room_name || 'Room Reservation'} (ห้อง {firstItem?.room_number || '-'})
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-resort-600" />
                      <span>
                        {formatDateThai(booking.check_in_date)} - {formatDateThai(booking.check_out_date)} ({booking.total_nights} คืน)
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-600">
                    ยอดสุทธิ: <span className="font-bold text-slate-900">{formatCurrency(booking.net_total)}</span>
                    {Number(booking.remaining_balance) > 0 ? (
                      <span className="text-red-600 ml-2 font-bold">
                        (คงเหลือ: {formatCurrency(booking.remaining_balance)})
                      </span>
                    ) : (
                      <span className="text-green-600 ml-2 font-bold">
                        (ชำระครบแล้ว)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-resort-50 hover:bg-resort-100 text-resort-700 text-xs font-bold rounded-xl border border-resort-200 flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ดูใบจอง (Voucher)</span>
                  </Link>

                  {Number(booking.remaining_balance) > 0 && booking.status !== 'CANCELLED' && (
                    <Link
                      href={`/bookings/${booking.id}/payment`}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>ชำระเงิน</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
