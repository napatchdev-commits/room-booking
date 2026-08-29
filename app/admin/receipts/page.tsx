'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Payment, UserRole, Settings } from '@/types/database';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { checkRolePermission } from '@/lib/permissions';
import { generateReceiptPdf } from '@/lib/pdf-generator';
import { Receipt as ReceiptIcon, Plus, Download, Printer, XCircle, AlertCircle, Eye } from 'lucide-react';
import Link from 'next/link';

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [verifiedPaymentsWithoutReceipt, setVerifiedPaymentsWithoutReceipt] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Issue Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);

  // Cancel Modal State
  const [cancelReceiptId, setCancelReceiptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Role
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');

  useEffect(() => {
    const role = (localStorage.getItem('resort_admin_role') as UserRole) || 'OWNER';
    setCurrentRole(role);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rRes, pRes, sRes] = await Promise.all([
        fetch('/api/receipts'),
        fetch('/api/payments?status=VERIFIED'),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);
      const rData = await rRes.json();
      const pData = await pRes.json();
      const sData = await sRes.json();

      if (rData.success) setReceipts(rData.receipts || []);
      if (sData.success) setSettings(sData.settings);

      // Filter verified payments that don't have an active receipt
      if (pData.success && pData.payments && rData.receipts) {
        const issuedPaymentIds = new Set(
          rData.receipts.filter((r: Receipt) => r.status !== 'CANCELLED').map((r: Receipt) => r.payment_id)
        );
        const unissued = pData.payments.filter((p: Payment) => !issuedPaymentIds.has(p.id));
        setVerifiedPaymentsWithoutReceipt(unissued);
        if (unissued.length > 0) {
          setSelectedPaymentId(unissued[0].id);
        }
      }
    } catch (err) {
      console.error('Receipts load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Issue Receipt (Strict Permission Check: receipt.create)
  const handleIssueReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRolePermission(currentRole, 'receipt.create')) {
      setIssueError('Permission denied: สิทธิ์ receipt.create เท่านั้นที่สามารถออกใบเสร็จได้');
      return;
    }

    if (!selectedPaymentId) {
      setIssueError('กรุณาเลือกรายการชำระเงินที่ต้องการออกใบเสร็จ');
      return;
    }

    setIssueError(null);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPaymentId,
          notes: issueNotes,
          actorRole: currentRole,
          actorName: `Staff (${currentRole})`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setIssueError(data.error || 'Failed to issue receipt');
        return;
      }

      setIsIssueModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Issue receipt error:', err);
      setIssueError('Server connection error');
    }
  };

  // Cancel Receipt (Strict Permission Check: receipt.cancel)
  const handleCancelReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReceiptId) return;

    if (!checkRolePermission(currentRole, 'receipt.cancel')) {
      setCancelError('Permission denied: สิทธิ์ receipt.cancel เท่านั้นที่สามารถยกเลิกใบเสร็จได้');
      return;
    }

    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกใบเสร็จ');
      return;
    }

    setCancelError(null);
    try {
      const res = await fetch(`/api/receipts/${cancelReceiptId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelReason,
          actorRole: currentRole,
          actorName: `Admin (${currentRole})`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setCancelError(data.error || 'Failed to cancel receipt');
        return;
      }

      setCancelReceiptId(null);
      setCancelReason('');
      fetchData();
    } catch (err) {
      console.error('Cancel receipt error:', err);
      setCancelError('Server connection error');
    }
  };

  const handleDownloadPdf = (receipt: Receipt) => {
    if (!settings) return;
    try {
      const doc = generateReceiptPdf(receipt, settings);
      doc.save(`Receipt_${receipt.receipt_number}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  const canCreateReceipt = checkRolePermission(currentRole, 'receipt.create');
  const canCancelReceipt = checkRolePermission(currentRole, 'receipt.cancel');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ReceiptIcon className="w-7 h-7 text-resort-600" />
            <span>จัดการใบเสร็จรับเงิน (Official Receipts)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ออกใบเสร็จรับเงินตามยอดชำระจริง ตรวจสอบและยกเลิกใบเสร็จพร้อมเก็บประวัติ
          </p>
        </div>

        {canCreateReceipt && (
          <button
            onClick={() => {
              setIssueError(null);
              setIsIssueModalOpen(true);
            }}
            className="px-4 py-2 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ ออกใบเสร็จรับเงิน</span>
          </button>
        )}
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">กำลังโหลดใบเสร็จรับเงิน...</div>
        ) : receipts.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="text-3xl">🧾</div>
            <h3 className="text-sm font-bold text-slate-800">ยังไม่มีใบเสร็จรับเงินที่ออก</h3>
            <p className="text-xs text-slate-400">
              เมื่อมีการชำระเงินที่อนุมัติแล้ว คุณสามารถกดปุ่ม &quot;+ ออกใบเสร็จรับเงิน&quot; ด้านบนได้
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">เลขที่ใบเสร็จ</th>
                  <th className="p-3">รหัสการจอง</th>
                  <th className="p-3">ลูกค้า</th>
                  <th className="p-3 text-right">จำนวนเงิน (THB)</th>
                  <th className="p-3">วันที่ออก</th>
                  <th className="p-3">ผู้ออกใบเสร็จ</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-resort-700">{r.receipt_number}</td>
                    <td className="p-3 font-semibold text-slate-700">
                      {r.booking?.booking_number || r.booking_id}
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {r.booking?.customer?.full_name || '-'}
                    </td>
                    <td className="p-3 text-right font-extrabold text-slate-900 text-sm">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="p-3 text-slate-500">{formatDateTime(r.issued_at)}</td>
                    <td className="p-3 text-slate-600">{r.issuer?.full_name || 'Staff'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'ISSUED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/receipts/${r.id}`}
                        title="ดูใบเสร็จ"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-block align-middle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleDownloadPdf(r)}
                        title="ดาวน์โหลด PDF"
                        className="p-1.5 bg-resort-50 hover:bg-resort-100 text-resort-700 rounded-lg inline-block align-middle border border-resort-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {r.status === 'ISSUED' && canCancelReceipt && (
                        <button
                          onClick={() => {
                            setCancelReceiptId(r.id);
                            setCancelError(null);
                          }}
                          title="ยกเลิกใบเสร็จ"
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg inline-block align-middle border border-red-200"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Receipt Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              ออกใบเสร็จรับเงิน (Issue Receipt)
            </h2>

            {issueError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                {issueError}
              </div>
            )}

            {verifiedPaymentsWithoutReceipt.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                ไม่มีรายการชำระเงินที่อนุมัติแล้วที่ยังไม่ออกใบเสร็จ
              </div>
            ) : (
              <form onSubmit={handleIssueReceipt} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เลือกรายการชำระเงิน (Verified Payments) *
                  </label>
                  <select
                    value={selectedPaymentId}
                    onChange={(e) => setSelectedPaymentId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {verifiedPaymentsWithoutReceipt.map((p) => {
                      const b = (p as any).booking;
                      return (
                        <option key={p.id} value={p.id}>
                          {formatCurrency(p.amount)} - {b?.booking_number} ({b?.customer?.full_name})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                  <input
                    type="text"
                    placeholder="เช่น ออกให้ตามคำขอของลูกค้า"
                    value={issueNotes}
                    onChange={(e) => setIssueNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsIssueModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-resort-700 text-white rounded-xl font-bold shadow-md"
                  >
                    ยืนยันออกใบเสร็จ
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Cancel Receipt Modal */}
      {cancelReceiptId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-3 text-xs">
            <h3 className="text-base font-bold text-red-600">ยืนยันยกเลิกใบเสร็จรับเงิน</h3>
            <p className="text-slate-500 text-[11px]">
              ใบเสร็จที่ออกแล้วจะไม่ถูกลบออกจากระบบ แต่จะถูกเปลี่ยนสถานะเป็น CANCELLED
            </p>

            {cancelError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-lg font-medium">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelReceipt} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">เหตุผลการยกเลิก *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="เช่น ออกยอดเงินผิด, ลูกค้าขอยกเลิกและออกใหม่..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelReceiptId(null)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg font-bold"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 text-white rounded-lg font-bold"
                >
                  ยืนยันยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
