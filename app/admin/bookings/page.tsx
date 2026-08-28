'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Booking, UserRole } from '@/types/database';
import { formatCurrency, formatDateThai, formatDateTime, formatPhone } from '@/lib/formatters';
import { checkRolePermission } from '@/lib/permissions';
import {
  BookOpenCheck,
  Search,
  Filter,
  Tag,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  DoorOpen,
  AlertCircle,
} from 'lucide-react';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Manual Discount Modal State
  const [selectedBookingForDiscount, setSelectedBookingForDiscount] = useState<Booking | null>(null);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('FIXED_AMOUNT');
  const [discountValue, setDiscountValue] = useState<number>(200);
  const [discountReason, setDiscountReason] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Current Role
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');

  useEffect(() => {
    const role = (localStorage.getItem('resort_admin_role') as UserRole) || 'OWNER';
    setCurrentRole(role);
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      let url = `/api/bookings?status=${statusFilter}`;
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, actorName: 'Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings();
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForDiscount) return;

    if (!discountReason.trim()) {
      setDiscountError('กรุณาระบุเหตุผลการให้ส่วนลดพิเศษ');
      return;
    }

    setIsApplyingDiscount(true);
    setDiscountError(null);

    try {
      const res = await fetch(`/api/bookings/${selectedBookingForDiscount.id}/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountType,
          discountValue,
          reason: discountReason,
          actorRole: currentRole,
          actorName: `Admin (${currentRole})`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setDiscountError(data.error || 'Failed to apply discount');
        setIsApplyingDiscount(false);
        return;
      }

      setSelectedBookingForDiscount(null);
      setDiscountReason('');
      fetchBookings();
    } catch (err) {
      console.error('Discount apply error:', err);
      setDiscountError('Error submitting discount');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const hasDiscountPermission = checkRolePermission(currentRole, 'discount.manage');

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpenCheck className="w-7 h-7 text-resort-600" />
            <span>จัดการรายการจองห้องพัก (Bookings)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ตรวจสอบรายการจอง อัพเดทสถานะ เช็คอิน เช็คเอาท์ และให้ส่วนลดพิเศษ
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-resort-700 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL'
                ? 'ทั้งหมด'
                : st === 'PENDING'
                ? 'รอชำระ'
                : st === 'CONFIRMED'
                ? 'ยืนยันแล้ว'
                : st === 'CHECKED_IN'
                ? 'เข้าพัก'
                : st === 'CHECKED_OUT'
                ? 'เช็คเอาท์'
                : 'ยกเลิก'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลขจอง, ชื่อ, เบอร์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-resort-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-resort-700 text-white rounded-xl text-xs font-bold hover:bg-resort-800"
          >
            ค้นหา
          </button>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">กำลังโหลดข้อมูลการจอง...</div>
        ) : bookings.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="text-3xl">📅</div>
            <h3 className="text-sm font-bold text-slate-800">ไม่พบรายการจองตามเงื่อนไข</h3>
            <p className="text-xs text-slate-400">ลองเปลี่ยนตัวกรองสถานะหรือคำค้นหา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">เลขที่จอง</th>
                  <th className="p-3">ลูกค้า / เบอร์โทร</th>
                  <th className="p-3">ห้องพัก</th>
                  <th className="p-3">วันที่เข้าพัก</th>
                  <th className="p-3 text-right">ยอดสุทธิ</th>
                  <th className="p-3 text-right">ชำระแล้ว</th>
                  <th className="p-3 text-right">คงเหลือ</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((booking) => {
                  const firstItem = booking.booking_items?.[0];
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-resort-700">
                        {booking.booking_number}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{booking.customer?.full_name || '-'}</div>
                        <div className="text-[11px] text-slate-400">{formatPhone(booking.customer?.phone)}</div>
                      </td>
                      <td className="p-3 text-slate-700">
                        <span className="font-semibold">{firstItem?.room_name}</span>
                        <span className="text-slate-400 block text-[11px]">(ห้อง {firstItem?.room_number})</span>
                      </td>
                      <td className="p-3 text-slate-600">
                        <div>{booking.check_in_date} &rarr; {booking.check_out_date}</div>
                        <span className="text-[10px] text-resort-600 font-bold">({booking.total_nights} คืน)</span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency(booking.net_total)}
                        {Number(booking.manual_discount) > 0 && (
                          <div className="text-[10px] text-red-600">
                            (ลดพิเศษ -{formatCurrency(booking.manual_discount)})
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-semibold text-green-700">
                        {formatCurrency(booking.paid_amount)}
                      </td>
                      <td className="p-3 text-right font-bold text-red-600">
                        {formatCurrency(booking.remaining_balance)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            booking.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-700'
                              : booking.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : booking.status === 'CHECKED_IN'
                              ? 'bg-purple-100 text-purple-700'
                              : booking.status === 'CHECKED_OUT'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {/* Manual Discount Button (Requirement #6 & #12) */}
                        {hasDiscountPermission && booking.status !== 'CANCELLED' && (
                          <button
                            onClick={() => setSelectedBookingForDiscount(booking)}
                            title="ให้ส่วนลดพิเศษ (Manual Discount)"
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Status Transitions */}
                        {booking.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'CHECKED_IN')}
                            className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-bold text-[10px] border border-purple-200"
                          >
                            เช็คอิน
                          </button>
                        )}

                        {booking.status === 'CHECKED_IN' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'CHECKED_OUT')}
                            className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-[10px]"
                          >
                            เช็คเอาท์
                          </button>
                        )}

                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-block align-middle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Discount Modal (Requirement #6) */}
      {selectedBookingForDiscount && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-600" />
                <span>ให้ส่วนลดพิเศษ (Manual Discount)</span>
              </h2>
              <button
                onClick={() => setSelectedBookingForDiscount(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>
                <span className="text-slate-500">รหัสการจอง:</span>{' '}
                <span className="font-bold text-slate-800">{selectedBookingForDiscount.booking_number}</span>
              </div>
              <div>
                <span className="text-slate-500">ผู้เข้าพัก:</span>{' '}
                <span className="font-semibold text-slate-800">{selectedBookingForDiscount.customer?.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500">ยอดเดิม:</span>{' '}
                <span className="font-bold text-slate-900">{formatCurrency(selectedBookingForDiscount.net_total)}</span>
              </div>
            </div>

            {discountError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                {discountError}
              </div>
            )}

            <form onSubmit={handleApplyDiscount} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ประเภทส่วนลด *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="FIXED_AMOUNT">ลดเป็นจำนวนเงิน (THB)</option>
                    <option value="PERCENTAGE">ลดเป็นเปอร์เซ็นต์ (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">มูลค่าส่วนลด *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เหตุผลการให้ส่วนลด (บันทึก Audit Log) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="เช่น ลูกค้าประจำ, ชดเชยกรณีเปลี่ยนห้อง..."
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForDiscount(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isApplyingDiscount}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md"
                >
                  {isApplyingDiscount ? 'กำลังบันทึก...' : 'อนุมัติส่วนลดพิเศษ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
