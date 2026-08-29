'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Payment, UserRole, Settings } from '@/types/database';
import { formatCurrency, formatDateTime, formatDateThaiLong, thaiBahtText } from '@/lib/formatters';
import { checkRolePermission } from '@/lib/permissions';
import { generateReceiptPdf } from '@/lib/pdf-generator';
import {
  Receipt as ReceiptIcon,
  Plus,
  Download,
  Printer,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  X,
  Palmtree,
} from 'lucide-react';

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [verifiedPaymentsWithoutReceipt, setVerifiedPaymentsWithoutReceipt] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // View Receipt Preview Modal in Admin
  const [viewReceiptModal, setViewReceiptModal] = useState<Receipt | null>(null);

  // Delete Receipt Modal
  const [deleteReceiptModal, setDeleteReceiptModal] = useState<Receipt | null>(null);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState(false);

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
      setIssueNotes('');
      fetchData();
    } catch (err) {
      console.error('Issue receipt error:', err);
      setIssueError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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
      setCancelError('กรุณาระบุเหตุผลการยกเลิก');
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
      setCancelError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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

  const handleDeleteReceipt = async (id: string) => {
    setIsDeletingReceipt(true);
    try {
      const res = await fetch(`/api/receipts/${id}?actorName=Admin (${currentRole})`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeleteReceiptModal(null);
        if (viewReceiptModal?.id === id) {
          setViewReceiptModal(null);
        }
        fetchData();
      } else {
        alert(data.error || 'ไม่สามารถลบใบเสร็จได้');
      }
    } catch (err) {
      console.error('Delete receipt error:', err);
      alert('เกิดข้อผิดพลาดในการลบใบเสร็จ');
    } finally {
      setIsDeletingReceipt(false);
    }
  };

  const canCreateReceipt = checkRolePermission(currentRole, 'receipt.create');
  const canCancelReceipt = checkRolePermission(currentRole, 'receipt.cancel');

  return (
    <div className={viewReceiptModal ? "space-y-6 print:hidden no-print" : "space-y-6"}>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ReceiptIcon className="w-7 h-7 text-resort-600" />
            <span>จัดการใบเสร็จรับเงิน (Official Receipts)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ออกใบเสร็จรับเงินตามยอดชำระจริง ตรวจสอบ ดูตัวอย่าง และพิมพ์ใบเสร็จในหน้าแอดมิน
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
          <div className="p-8 text-center text-xs text-slate-400">กำลังโหลดรายการใบเสร็จ...</div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ReceiptIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-600">ยังไม่มีประวัติการออกใบเสร็จรับเงิน</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
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
                      {/* View inside Admin Modal */}
                      <button
                        onClick={() => setViewReceiptModal(r)}
                        title="ดูใบเสร็จในหน้าแอดมิน"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-block align-middle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

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
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg inline-block align-middle border border-amber-200"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteReceiptModal(r)}
                        title="ลบใบเสร็จ"
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg inline-block align-middle border border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin In-Page Receipt Preview Modal */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-transparent print:static print:overflow-visible print:block">
          <div className="bg-slate-100 rounded-3xl max-w-4xl w-full my-6 p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 print:p-0 print:m-0 print:bg-transparent print:shadow-none print:max-h-none print:overflow-visible print:border-0 print:rounded-none">
            {/* Modal Header Actions */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden no-print">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-resort-700 text-white flex items-center justify-center font-bold">
                  <ReceiptIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    ใบเสร็จรับเงิน #{viewReceiptModal.receipt_number}
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    ออกเมื่อ: {formatDateTime(viewReceiptModal.issued_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบเสร็จ</span>
                </button>

                <button
                  onClick={() => handleDownloadPdf(viewReceiptModal)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-resort-600" />
                  <span>ดาวน์โหลด PDF</span>
                </button>

                <button
                  onClick={() => setViewReceiptModal(null)}
                  className="p-1.5 bg-white hover:bg-slate-200 text-slate-500 rounded-xl border border-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Tax Receipt Document Box */}
            <div
              id="receipt-print-area"
              className="bg-white text-black p-6 sm:p-10 border border-black shadow-md mx-auto print:border-0 print:p-0 print:shadow-none font-sans text-xs leading-relaxed"
            >
              {/* Header Grid */}
              <div className="grid grid-cols-12 gap-2 pb-2">
                {/* Left: Resort Info */}
                <div className="col-span-8 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 border border-black flex flex-col items-center justify-center rounded-sm text-center leading-none p-1 flex-shrink-0">
                      <Palmtree className="w-5 h-5 text-black stroke-[1.75]" />
                      <span className="text-[7px] font-black tracking-tighter uppercase mt-0.5">SOMBAT</span>
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
                        {settings?.resort_name || 'สมบัติ รีสอร์ท'}
                      </h1>
                      <span className="text-[10px] text-black font-semibold tracking-wider uppercase block">
                        {settings?.resort_name_en || 'SOMBAT RESORT'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-black pt-1">
                    {settings?.address || '45/3 หมู่ 8 ตำบลราษฎร์นิยม อำเภอไทรน้อย จังหวัดนนทบุรี 11150'}
                  </p>

                  <p className="text-xs text-black">
                    Tel : {settings?.phone || '062-6252564'} &nbsp;&nbsp; Line : {settings?.line_id || '@sombatcom'}
                  </p>

                  <p className="text-xs text-black">
                    เลขประจำตัวผู้เสียภาษี : {settings?.tax_id || '0125569001220'}
                  </p>
                  <div className="w-full border-b border-black pt-1"></div>
                </div>

                {/* Right: Original Badge & Receipt Number / Date */}
                <div className="col-span-4 flex flex-col items-end justify-between">
                  <div className="border border-black px-6 py-1 text-center font-bold text-sm">
                    ต้นฉบับ
                  </div>

                  <div className="text-right space-y-0.5 mt-2 w-full">
                    <div className="text-base font-bold tracking-wide">ใบเสร็จรับเงิน</div>
                    <div className="text-xs font-bold tracking-wider">RECEIPT</div>
                    <div className="pt-1 flex justify-between text-xs font-bold">
                      <span>เล่มที่</span>
                      <span>1</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span>เลขที่</span>
                      <span>{viewReceiptModal.receipt_number}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span>วันที่</span>
                      <span>{formatDateThaiLong(viewReceiptModal.issued_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information Block */}
              <div className="my-3 space-y-1 text-xs">
                <div className="flex gap-2">
                  <span className="font-bold min-w-[55px]">ลูกค้า :</span>
                  <span className="font-bold text-slate-950">
                    {(viewReceiptModal.booking?.customer?.full_name || 'ลูกค้าทั่วไป').replace(/[^\w\s\u0E00-\u0E7F.,\-()/#]/g, '').trim()}
                  </span>
                </div>

                {viewReceiptModal.booking?.customer?.phone && (
                  <div className="flex gap-2 text-[11px] text-slate-700">
                    <span className="min-w-[55px]">เบอร์โทร :</span>
                    <span>{viewReceiptModal.booking.customer.phone}</span>
                  </div>
                )}

                <div className="flex gap-2 text-[11px] text-slate-700">
                  <span className="min-w-[55px]">ที่อยู่ :</span>
                  <span>-</span>
                </div>

                <div className="flex gap-2 text-[11px] text-slate-700">
                  <span className="min-w-[55px]">เลขประจำตัวผู้เสียภาษี :</span>
                  <span>{viewReceiptModal.booking?.customer?.id_card || '-'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-4 border border-black overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black text-center font-bold bg-white">
                      <th className="py-2 px-2 border-r border-black w-12">ลำดับ</th>
                      <th className="py-2 px-3 border-r border-black text-center">รายการ</th>
                      <th className="py-2 px-2 border-r border-black w-14 text-center">จำนวน</th>
                      <th className="py-2 px-2 border-r border-black w-14 text-center">หน่วย</th>
                      <th className="py-2 px-3 border-r border-black w-24 text-center">ราคา/หน่วย</th>
                      <th className="py-2 px-3 border-r border-black w-20 text-center">ส่วนลด</th>
                      <th className="py-2 px-3 w-28 text-center">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/30 text-xs">
                      <td className="py-2 px-2 border-r border-black text-center">1</td>
                      <td className="py-2 px-3 border-r border-black">
                        ชำระค่าห้องพัก (Ref: {viewReceiptModal.booking?.booking_number || viewReceiptModal.receipt_number})
                      </td>
                      <td className="py-2 px-2 border-r border-black text-center">1</td>
                      <td className="py-2 px-2 border-r border-black text-center">งวด</td>
                      <td className="py-2 px-3 border-r border-black text-right">
                        {Number(viewReceiptModal.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 border-r border-black text-center">-</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {Number(viewReceiptModal.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Empty padding rows (2 rows for compact A4 fit) */}
                    {Array.from({ length: 2 }).map((_, i) => (
                      <tr key={`empty-${i}`} className="border-b border-black/20 text-xs h-6">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                      </tr>
                    ))}

                    {/* Subtotal & Discount rows */}
                    <tr className="border-t border-black text-xs">
                      <td colSpan={5} rowSpan={2} className="border-r border-black align-top p-0"></td>
                      <td className="py-1 px-3 border-r border-black text-center font-bold">รวม</td>
                      <td className="py-1 px-3 text-right font-medium">
                        {Number(viewReceiptModal.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr className="border-t border-black text-xs">
                      <td className="py-1 px-3 border-r border-black text-center font-bold">ส่วนลด</td>
                      <td className="py-1 px-3 text-right font-medium">-</td>
                    </tr>

                    {/* Grand Total & Thai Baht Text row */}
                    <tr className="border-t-2 border-black font-bold text-xs bg-slate-100/70">
                      <td colSpan={5} className="py-2 px-4 border-r border-black text-center text-sm">
                        {thaiBahtText(viewReceiptModal.amount)}
                      </td>
                      <td className="py-2 px-3 border-r border-black text-center font-bold text-xs whitespace-nowrap">
                        รวมยอดเงินสุทธิ
                      </td>
                      <td className="py-2 px-3 text-right font-black text-sm">
                        {Number(viewReceiptModal.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Signature Box */}
              <div className="mt-6 print:mt-5 grid grid-cols-2 text-xs pt-2">
                <div>
                  <p className="text-[10px] text-slate-500">
                    * เอกสารนี้ออกโดยระบบอิเล็กทรอนิกส์ของรีสอร์ท
                  </p>
                </div>
                <div className="text-center space-y-6 print:space-y-4 ml-auto w-48">
                  <p className="font-bold text-xs">ผู้รับเงิน / ผู้มีอำนาจลงนาม</p>
                  <div className="border-b border-black"></div>
                  <p className="text-[11px] font-semibold text-slate-700">
                    ({viewReceiptModal.issuer?.full_name || settings?.resort_name || 'สมบัติ รีสอร์ท'})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

            <form onSubmit={handleIssueReceipt} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เลือกรายการชำระเงินที่ต้องการออกใบเสร็จ *
                </label>
                {verifiedPaymentsWithoutReceipt.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-center">
                    ไม่มีรายการชำระเงินที่รอออกใบเสร็จ
                  </div>
                ) : (
                  <select
                    value={selectedPaymentId}
                    onChange={(e) => setSelectedPaymentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {verifiedPaymentsWithoutReceipt.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatCurrency(p.amount)} ({p.payment_type}) - Booking #{p.booking_id}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <textarea
                  rows={2}
                  placeholder="ระบุหมายเหตุบนใบเสร็จ (ถ้ามี)"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={verifiedPaymentsWithoutReceipt.length === 0}
                  className="px-5 py-2 bg-resort-700 hover:bg-resort-800 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  ยืนยันออกใบเสร็จ
                </button>
              </div>
            </form>
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
                  className="px-4 py-1.5 bg-amber-600 text-white rounded-lg font-bold"
                >
                  ยืนยันยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Receipt Confirmation Modal */}
      {deleteReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">ยืนยันการลบใบเสร็จรับเงิน</h2>
                <p className="text-[11px] text-slate-500">ลบข้อมูลใบเสร็จรับเงินออกจากระบบถาวร</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">เลขที่ใบเสร็จ:</span>
                <span className="font-bold text-slate-900">{deleteReceiptModal.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ชื่อลูกค้า:</span>
                <span className="font-semibold text-slate-800">
                  {deleteReceiptModal.booking?.customer?.full_name || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">จำนวนเงิน:</span>
                <span className="font-bold text-slate-900">{formatCurrency(deleteReceiptModal.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่ออก:</span>
                <span className="font-bold text-slate-700">{formatDateTime(deleteReceiptModal.issued_at)}</span>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>คุณต้องการลบใบเสร็จรับเงินนี้ใช่หรือไม่?</span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingReceipt}
                onClick={() => setDeleteReceiptModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeletingReceipt}
                onClick={() => handleDeleteReceipt(deleteReceiptModal.id)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingReceipt ? 'กำลังลบ...' : 'ยืนยันลบใบเสร็จ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
