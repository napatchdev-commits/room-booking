'use client';

import React, { useState, useEffect } from 'react';
import { Payment, UserRole } from '@/types/database';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { checkRolePermission } from '@/lib/permissions';
import { CreditCard, CheckCircle2, XCircle, Eye, AlertCircle, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);

  // Reject Modal
  const [rejectPaymentId, setRejectPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Role
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');

  useEffect(() => {
    const role = (localStorage.getItem('resort_admin_role') as UserRole) || 'OWNER';
    setCurrentRole(role);
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payments?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Fetch payments error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleVerify = async (paymentId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
    if (!checkRolePermission(currentRole, 'payment.verify')) {
      alert('คุณไม่มีสิทธิ์ payment.verify ในการตรวจสอบสลิป');
      return;
    }

    try {
      const res = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectionReason: reason,
          actorRole: currentRole,
          actorName: `Staff (${currentRole})`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Verification failed');
        return;
      }

      setRejectPaymentId(null);
      setRejectionReason('');
      fetchPayments();
    } catch (err) {
      console.error('Verification error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-resort-600" />
            <span>ตรวจสอบการชำระเงินและสลิป (Payment Verification)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ตรวจสลิปโอนเงิน อนุมัติยอดชำระ และอัพเดทสถานะการจองอัตโนมัติ
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['PENDING', 'VERIFIED', 'REJECTED', 'ALL'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === st
                ? 'bg-resort-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'PENDING'
              ? 'รอตรวจสอบ (Pending)'
              : st === 'VERIFIED'
              ? 'อนุมัติแล้ว (Verified)'
              : st === 'REJECTED'
              ? 'ปฏิเสธ (Rejected)'
              : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">กำลังโหลดข้อมูลการชำระเงิน...</div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="text-3xl">💳</div>
            <h3 className="text-sm font-bold text-slate-800">ไม่พบรายการชำระเงินในหมวดนี้</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">รหัสการจอง</th>
                  <th className="p-3">ลูกค้า</th>
                  <th className="p-3">ประเภทชำระ</th>
                  <th className="p-3 text-right">จำนวนเงิน</th>
                  <th className="p-3 text-center">สลิป</th>
                  <th className="p-3">เวลาที่แจ้ง</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const booking = (p as any).booking;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-resort-700">
                        <Link href={`/admin/bookings/${p.booking_id}`} className="hover:underline">
                          {booking?.booking_number || p.booking_id}
                        </Link>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {booking?.customer?.full_name || '-'}
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="font-bold">{p.payment_type}</span> • {p.payment_method}
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900 text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="p-3 text-center">
                        {p.slip_url ? (
                          <button
                            onClick={() => setSelectedSlipUrl(p.slip_url || null)}
                            className="p-1.5 bg-resort-50 text-resort-700 hover:bg-resort-100 rounded-lg inline-flex items-center gap-1 font-bold text-[11px]"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>ดูสลิป</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">{formatDateTime(p.created_at)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'VERIFIED'
                              ? 'bg-green-100 text-green-700'
                              : p.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleVerify(p.id, 'VERIFIED')}
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[11px] shadow-sm"
                            >
                              อนุมัติสลิป
                            </button>
                            <button
                              onClick={() => setRejectPaymentId(p.id)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold text-[11px] border border-red-200"
                            >
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slip Zoom Modal */}
      {selectedSlipUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800">ภาพสลิปการโอนเงิน</span>
              <button onClick={() => setSelectedSlipUrl(null)} className="text-xs font-bold text-slate-400">
                ✕ ปิด
              </button>
            </div>
            <img src={selectedSlipUrl} alt="Payment Slip" className="max-h-[70vh] mx-auto rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectPaymentId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-xs">
            <h3 className="text-sm font-bold text-red-600">ระบุเหตุผลการปฏิเสธสลิป</h3>
            <textarea
              rows={3}
              placeholder="เช่น ยอดเงินไม่ตรงกับสลิป, สลิปซ้ำ..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectPaymentId(null)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleVerify(rejectPaymentId, 'REJECTED', rejectionReason)}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold"
              >
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
