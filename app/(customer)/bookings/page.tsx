'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiff } from '@/components/providers/LiffProvider';
import { Booking } from '@/types/database';
import { formatCurrency, formatDateThai } from '@/lib/formatters';
import { BookOpenCheck, Calendar, Clock, CreditCard, ChevronRight, AlertCircle, FileText } from 'lucide-react';

export default function MyBookingsPage() {
  const { customer, profile, customerId } = useLiff();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneSearch, setPhoneSearch] = useState('');

  const fetchBookings = async (cId?: string | null, phone?: string) => {
    setIsLoading(true);
    try {
      let url = '/api/bookings';
      if (cId) {
        url += `?customerId=${cId}`;
      } else if (phone) {
        url += `?search=${phone}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.bookings) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchBookings(customerId);
    } else if (customer?.phone) {
      fetchBookings(null, customer.phone);
    } else {
      fetchBookings();
    }
  }, [customerId, customer]);

  const handlePhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneSearch.trim()) {
      fetchBookings(null, phoneSearch.trim());
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpenCheck className="w-7 h-7 text-resort-600" />
            <span>การจองของฉัน (My Bookings)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ประวัติและสถานะการจองห้องพักทั้งหมดของคุณ
          </p>
        </div>

        {/* Quick Phone Search if not logged into LINE */}
        {!customerId && (
          <form onSubmit={handlePhoneSearch} className="flex gap-2">
            <input
              type="tel"
              placeholder="ค้นหาด้วยเบอร์โทร..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-resort-500/20"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-resort-600 hover:bg-resort-700 text-white rounded-lg text-xs font-bold"
            >
              ค้นหา
            </button>
          </form>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-resort-50 text-resort-600 flex items-center justify-center mx-auto text-2xl">
            📅
          </div>
          <h3 className="text-base font-bold text-slate-800">
            ไม่พบประวัติการจอง
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            คุณยังไม่มีรายการจองห้องพัก สามารถค้นหาและจองห้องพักที่ต้องการได้ทันที
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-resort-600 hover:bg-resort-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <span>ค้นหาห้องพัก</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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
