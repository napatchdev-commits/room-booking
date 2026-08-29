'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Booking, UserRole } from '@/types/database';
import { formatCurrency, formatDateThai, formatDateTime, formatPhone } from '@/lib/formatters';
import { checkRolePermission } from '@/lib/permissions';
import {
  BookOpenCheck,
  Calendar,
  CreditCard,
  Receipt as ReceiptIcon,
  Tag,
  Shield,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  History,
  Trash2,
} from 'lucide-react';

export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Change state
  const [statusInput, setStatusInput] = useState<Booking['status']>('PENDING');

  useEffect(() => {
    const role = (localStorage.getItem('resort_admin_role') as UserRole) || 'OWNER';
    setCurrentRole(role);
  }, []);

  const fetchBooking = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (data.success && data.booking) {
        setBooking(data.booking);
        setStatusInput(data.booking.status);
      }
    } catch (err) {
      console.error('Failed to load booking:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!booking) return;
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusInput,
          actorRole: currentRole,
          actorName: `Admin (${currentRole})`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('อัพเดทสถานะการจองสำเร็จ');
        fetchBooking();
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleDeleteBooking = async () => {
    if (!booking) return;
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการจอง ${booking.booking_number} นี้? ข้อมูลทั้งหมดจะถูกลบถาวร`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}?actorName=Admin (${currentRole})`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('ลบรายการจองสำเร็จ');
        router.push('/admin/bookings');
      } else {
        alert(data.error || 'ไม่สามารถลบรายการจองได้');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">กำลังโหลดข้อมูลการจอง...</div>;
  }

  if (!booking) {
    return <div className="p-12 text-center text-xs text-red-600 font-bold">ไม่พบข้อมูลการจอง</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้ารายการจอง</span>
        </Link>

        <div className="flex items-center gap-2">
          <select
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value as Booking['status'])}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
          >
            <option value="PENDING">รอการชำระเงิน (PENDING)</option>
            <option value="CONFIRMED">ยืนยันแล้ว (CONFIRMED)</option>
            <option value="CHECKED_IN">เข้าพัก (CHECKED_IN)</option>
            <option value="CHECKED_OUT">เช็คเอาท์ (CHECKED_OUT)</option>
            <option value="CANCELLED">ยกเลิก (CANCELLED)</option>
          </select>

          <button
            onClick={handleUpdateStatus}
            className="px-3.5 py-1.5 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            บันทึกสถานะ
          </button>

          <button
            onClick={handleDeleteBooking}
            disabled={isDeleting}
            title="ลบรายการจองนี้"
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'กำลังลบ...' : 'ลบการจอง'}</span>
          </button>
        </div>
      </div>

      {/* Main Booking Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Info & Rooms & Payments */}
        <div className="lg:col-span-8 space-y-6">
          {/* Guest & Stay Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-slate-400">รหัสการจอง</span>
                <div className="text-lg font-extrabold text-resort-700">{booking.booking_number}</div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  booking.status === 'CONFIRMED'
                    ? 'bg-green-100 text-green-700'
                    : booking.status === 'PENDING'
                    ? 'bg-amber-100 text-amber-700'
                    : booking.status === 'CHECKED_IN'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {booking.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">ข้อมูลผู้เข้าพัก</div>
                <div><span className="text-slate-500">ชื่อ:</span> <span className="font-semibold text-slate-900">{booking.customer?.full_name}</span></div>
                <div><span className="text-slate-500">โทร:</span> <span className="font-semibold text-slate-900">{formatPhone(booking.customer?.phone)}</span></div>
                <div><span className="text-slate-500">อีเมล:</span> <span className="font-semibold text-slate-900">{booking.customer?.email || '-'}</span></div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">ข้อมูลการเข้าพัก</div>
                <div><span className="text-slate-500">เช็คอิน:</span> <span className="font-semibold text-slate-900">{formatDateThai(booking.check_in_date)}</span></div>
                <div><span className="text-slate-500">เช็คเอาท์:</span> <span className="font-semibold text-slate-900">{formatDateThai(booking.check_out_date)}</span></div>
                <div><span className="text-slate-500">จำนวนคืน / ผู้เข้าพัก:</span> <span className="font-bold text-resort-700">{booking.total_nights} คืน ({booking.num_guests} ท่าน)</span></div>
              </div>
            </div>
          </div>

          {/* Booked Rooms Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              ห้องพักในรายการจอง (Snapshot Rate)
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">ห้อง</th>
                    <th className="p-3 text-right">ราคา/คืน</th>
                    <th className="p-3 text-center">คืน</th>
                    <th className="p-3 text-right">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(booking.booking_items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="p-3 font-semibold text-slate-800">
                        {item.room_name} (ห้อง {item.room_number})
                      </td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(item.price_per_night)}</td>
                      <td className="p-3 text-center text-slate-600">{item.nights}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.item_subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Receipts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>ประวัติการชำระเงินและใบเสร็จ (Payments & Receipts)</span>
              <Link
                href="/admin/payments"
                className="text-resort-700 hover:underline normal-case font-bold"
              >
                ไปหน้าตรวจสอบสลิป &rarr;
              </Link>
            </h3>

            {(!booking.payments || booking.payments.length === 0) ? (
              <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                ยังไม่มีประวัติการชำระเงิน
              </div>
            ) : (
              <div className="space-y-2">
                {booking.payments.map((p) => {
                  const receipt = booking.receipts?.find((r) => r.payment_id === p.id);
                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          {formatCurrency(p.amount)} ({p.payment_type}) - วิธี: {p.payment_method}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDateTime(p.created_at)} • สถานะ: <span className="font-bold text-slate-700">{p.status}</span>
                        </div>
                      </div>

                      <div>
                        {receipt ? (
                          <Link
                            href={`/receipts/${receipt.id}`}
                            className="px-2.5 py-1 bg-white text-resort-700 border border-slate-200 rounded-lg font-bold"
                          >
                            ใบเสร็จ #{receipt.receipt_number} ({receipt.status})
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-[11px]">ไม่มีใบเสร็จ</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Calculation Breakdown & Discounts */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              สูตรคำนวณราคา (Price Breakdown)
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>ราคาห้องเต็ม:</span>
                <span className="font-medium">{formatCurrency(booking.subtotal_amount)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-medium">
                <span>หัก โปรโมชั่น:</span>
                <span>-{formatCurrency(booking.promotion_discount)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-medium">
                <span>หัก ส่วนลด Manual:</span>
                <span>-{formatCurrency(booking.manual_discount)}</span>
              </div>

              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>ยอดสุทธิ (Net Total):</span>
                <span className="text-resort-700">{formatCurrency(booking.net_total)}</span>
              </div>

              <div className="flex justify-between text-green-700 font-bold pt-1 border-t border-slate-100">
                <span>หัก เงินที่ชำระแล้ว:</span>
                <span>{formatCurrency(booking.paid_amount)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-extrabold text-sm pt-1 border-t border-slate-200">
                <span>ยอดคงเหลือ:</span>
                <span>{formatCurrency(booking.remaining_balance)}</span>
              </div>
            </div>
          </div>

          {/* Discounts Breakdown Card */}
          {booking.booking_discounts && booking.booking_discounts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-resort-600" />
                <span>ประวัติส่วนลดที่ได้รับ</span>
              </h3>

              <div className="space-y-2 text-xs">
                {booking.booking_discounts.map((d) => (
                  <div key={d.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{d.type === 'PROMOTION' ? 'โปรโมชั่น' : 'ส่วนลดพิเศษ (Manual)'}</span>
                      <span className="text-red-600">-{formatCurrency(d.applied_amount)}</span>
                    </div>
                    {d.reason && (
                      <div className="text-[11px] text-slate-500 mt-0.5">เหตุผล: {d.reason}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">
                      ผู้อนุมัติ: {d.authorizer?.full_name || 'Admin'} • {formatDateTime(d.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
