'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Booking, UserRole, Settings } from '@/types/database';
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
  User,
  Calendar,
  CreditCard,
  FileText,
  Building,
} from 'lucide-react';

interface ReceiptItemRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
}

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // View Receipt Preview Modal in Admin
  const [viewReceiptModal, setViewReceiptModal] = useState<Receipt | null>(null);

  // Delete Receipt Modal
  const [deleteReceiptModal, setDeleteReceiptModal] = useState<Receipt | null>(null);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState(false);

  // Issue Receipt Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Form Fields
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('SC26-001');
  const [bookNo, setBookNo] = useState('1');
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [issuerName, setIssuerName] = useState('สมบัติ รีสอร์ท');
  const [receiptNotes, setReceiptNotes] = useState('');

  // Itemized Dynamic Rows
  const [itemRows, setItemRows] = useState<ReceiptItemRow[]>([
    {
      id: '1',
      description: 'ชำระค่าห้องพัก',
      quantity: 1,
      unit: 'งวด',
      unitPrice: 500,
      discount: 0,
      total: 500,
    },
  ]);

  // Cancel Modal State
  const [cancelReceiptId, setCancelReceiptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Current Role
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');

  useEffect(() => {
    const role = (localStorage.getItem('resort_admin_role') as UserRole) || 'OWNER';
    setCurrentRole(role);
  }, []);

  // Fetch all receipts, bookings, and settings
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rRes, bRes, sRes] = await Promise.all([
        fetch('/api/receipts'),
        fetch('/api/bookings?isAdmin=true'),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);
      const rData = await rRes.json();
      const bData = await bRes.json();
      const sData = await sRes.json();

      if (rData.success) setReceipts(rData.receipts || []);
      if (bData.success) setBookings(bData.bookings || []);
      if (sData.success && sData.settings) {
        setSettings(sData.settings);
        if (sData.settings.resort_name) {
          setIssuerName(sData.settings.resort_name);
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

  // Load next sequential receipt number
  const fetchNextReceiptNumber = async () => {
    try {
      const res = await fetch('/api/receipts?action=next-number');
      const data = await res.json();
      if (data.success && data.nextReceiptNumber) {
        setReceiptNumber(data.nextReceiptNumber);
      }
    } catch {
      setReceiptNumber('SC26-001');
    }
  };

  // Open Issue Modal
  const handleOpenIssueModal = async () => {
    setIssueError(null);
    setSelectedBookingId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerTaxId('');
    setBookNo('1');
    setIssuedAt(new Date().toISOString().slice(0, 10));
    setReceiptNotes('');
    setIssuerName(settings?.resort_name || 'สมบัติ รีสอร์ท');
    setItemRows([
      {
        id: '1',
        description: 'ชำระค่าห้องพัก',
        quantity: 1,
        unit: 'งวด',
        unitPrice: 500,
        discount: 0,
        total: 500,
      },
    ]);
    await fetchNextReceiptNumber();
    setIsIssueModalOpen(true);
  };

  // Auto-fill when booking/tenant is selected
  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    if (!bookingId) return;

    const foundBooking = bookings.find((b) => b.id === bookingId);
    if (foundBooking) {
      const cust = foundBooking.customer;
      if (cust?.full_name) setCustomerName(cust.full_name);
      if (cust?.phone) setCustomerPhone(cust.phone);
      if (cust?.id_card) setCustomerTaxId(cust.id_card);

      const items = foundBooking.booking_items || [];
      if (items.length > 0) {
        const newRows: ReceiptItemRow[] = items.map((it, idx) => ({
          id: String(idx + 1),
          description: `ชำระค่าห้องพัก ${it.room_name || ''} (${it.room_number || ''})`,
          quantity: it.nights || 1,
          unit: 'คืน',
          unitPrice: Number(it.price_per_night) || 0,
          discount: 0,
          total: Number(it.item_subtotal) || (Number(it.price_per_night) * (it.nights || 1)),
        }));
        setItemRows(newRows);
      } else {
        const total = Number(foundBooking.net_total || foundBooking.paid_amount || 500);
        setItemRows([
          {
            id: '1',
            description: `ชำระค่าห้องพัก (Ref: ${foundBooking.booking_number})`,
            quantity: 1,
            unit: 'งวด',
            unitPrice: total,
            discount: 0,
            total: total,
          },
        ]);
      }
    }
  };

  // Handle dynamic row changes
  const handleItemChange = (index: number, field: keyof ReceiptItemRow, value: any) => {
    const updated = [...itemRows];
    const row = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const qty = Number(field === 'quantity' ? value : row.quantity) || 0;
      const price = Number(field === 'unitPrice' ? value : row.unitPrice) || 0;
      const disc = Number(field === 'discount' ? value : row.discount) || 0;
      row.total = Math.max(0, qty * price - disc);
    }

    updated[index] = row;
    setItemRows(updated);
  };

  const handleAddItemRow = () => {
    const newId = String(itemRows.length + 1);
    setItemRows([
      ...itemRows,
      {
        id: newId,
        description: 'ค่าบริการเพิ่มเติม',
        quantity: 1,
        unit: 'รายการ',
        unitPrice: 0,
        discount: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (itemRows.length <= 1) return;
    const updated = itemRows.filter((_, i) => i !== index);
    setItemRows(updated);
  };

  // Calculate totals
  const subtotalAmount = itemRows.reduce((acc, r) => acc + (Number(r.quantity) * Number(r.unitPrice) || 0), 0);
  const totalDiscount = itemRows.reduce((acc, r) => acc + (Number(r.discount) || 0), 0);
  const grandTotal = Math.max(0, subtotalAmount - totalDiscount);

  // Submit Issue Receipt
  const handleSubmitIssueReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRolePermission(currentRole, 'receipt.create')) {
      setIssueError('Permission denied: สิทธิ์ receipt.create เท่านั้นที่สามารถออกใบเสร็จได้');
      return;
    }

    if (!customerName.trim()) {
      setIssueError('กรุณากรอกชื่อผู้เช่า / ลูกค้า');
      return;
    }

    if (itemRows.length === 0 || grandTotal <= 0) {
      setIssueError('กรุณาระบุรายการสินค้าและจำนวนเงินให้ถูกต้อง');
      return;
    }

    setIsSubmittingReceipt(true);
    setIssueError(null);

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNumber: receiptNumber.trim(),
          bookNo: bookNo.trim() || '1',
          issuedAt: issuedAt || new Date().toISOString(),
          bookingId: selectedBookingId || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          customerTaxId: customerTaxId.trim(),
          items: itemRows,
          amount: grandTotal,
          notes: receiptNotes.trim(),
          issuerName: issuerName.trim(),
          actorRole: currentRole,
          actorName: `Admin (${currentRole})`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setIssueError(data.error || 'Failed to issue receipt');
        setIsSubmittingReceipt(false);
        return;
      }

      setIsIssueModalOpen(false);
      setIsSubmittingReceipt(false);
      await fetchData();

      // Open in preview modal right away
      if (data.receipt) {
        setViewReceiptModal(data.receipt);
      }
    } catch (err) {
      console.error('Issue receipt error:', err);
      setIssueError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setIsSubmittingReceipt(false);
    }
  };

  // Cancel Receipt
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

  // Download PDF
  const handleDownloadPdf = (receipt: Receipt) => {
    if (!settings) return;
    try {
      const doc = generateReceiptPdf(receipt, settings);
      doc.save(`Receipt_${receipt.receipt_number}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
  };

  // Delete Receipt
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
    <div className="space-y-6">
      {/* =========================================================================
          MAIN ADMIN UI (HIDDEN WHEN PRINTING)
          ========================================================================= */}
      <div className="space-y-6 print:hidden no-print">
        {/* Title & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ReceiptIcon className="w-7 h-7 text-resort-600" />
              <span>จัดการใบเสร็จรับเงิน (Official Receipts)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ออกใบเสร็จรับเงิน (รันเลข SC26-001) กรอกข้อมูลเองหรือเลือกผู้เช่า ตรวจสอบและสั่งพิมพ์
            </p>
          </div>

          {canCreateReceipt && (
            <button
              onClick={handleOpenIssueModal}
              className="px-4 py-2.5 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
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
              <p className="text-[11px] text-slate-400">คลิกที่ปุ่ม "+ ออกใบเสร็จรับเงิน" เพื่อสร้างบิลใบเสร็จ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-3">เลขที่ใบเสร็จ</th>
                    <th className="p-3">รหัสการจอง / ผู้เช่า</th>
                    <th className="p-3">ลูกค้า / ผู้เช่า</th>
                    <th className="p-3 text-right">จำนวนเงิน (THB)</th>
                    <th className="p-3">วันที่ออก</th>
                    <th className="p-3">ผู้ออกใบเสร็จ</th>
                    <th className="p-3">สถานะ</th>
                    <th className="p-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map((r: any) => {
                    const displayCustName =
                      r.customDetails?.customer_name || r.booking?.customer?.full_name || '-';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3 font-extrabold text-resort-700">{r.receipt_number}</td>
                        <td className="p-3 font-semibold text-slate-700">
                          {r.booking?.booking_number || 'Custom Manual'}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {displayCustName}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 text-sm">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="p-3 text-slate-500">{formatDateTime(r.issued_at)}</td>
                        <td className="p-3 text-slate-600">
                          {r.customDetails?.issuer_name || r.issuer?.full_name || 'สมบัติ รีสอร์ท'}
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          ISSUE RECEIPT MODAL (MANUAL DATA ENTRY + SELECT TENANT / BOOKING)
          ========================================================================= */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full my-6 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-resort-700 text-white flex items-center justify-center font-bold">
                  <ReceiptIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ออกใบเสร็จรับเงิน (Issue Official Receipt)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    กรอกข้อมูลเองหรือเลือกผู้เช่าจากการจองเพื่อดึงข้อมูลอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {issueError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
                {issueError}
              </div>
            )}

            <form onSubmit={handleSubmitIssueReceipt} className="space-y-4 text-xs">
              {/* Section 1: Tenant / Booking Selector */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-resort-600" />
                  <span>เลือกผู้เช่า / รายการจอง (Auto-Fill)</span>
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => handleSelectBooking(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:border-resort-500"
                >
                  <option value="">✏️ กรอกข้อมูลเองทั้งหมด (ไม่ผูกกับการจอง / Custom Manual)</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.booking_number}] {b.customer?.full_name || 'ลูกค้า'} - ยอด {formatCurrency(b.net_total || b.paid_amount)} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 2: General & Numbering */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขที่ใบเสร็จ *</label>
                  <input
                    type="text"
                    required
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="SC26-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-resort-700"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">รันเลขอัตโนมัติ (เช่น SC26-001)</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">เล่มที่</label>
                  <input
                    type="text"
                    value={bookNo}
                    onChange={(e) => setBookNo(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันที่ออกใบเสร็จ *</label>
                  <input
                    type="date"
                    required
                    value={issuedAt}
                    onChange={(e) => setIssuedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Section 3: Customer / Tenant Details */}
              <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <User className="w-4 h-4 text-slate-600" />
                  <span>ข้อมูลผู้เช่า / ลูกค้า</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ชื่อลูกค้า / ผู้เช่า <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น คุณสมบัติ สมใจดี"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      placeholder="08X-XXX-XXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี / บัตรประชาชน</label>
                    <input
                      type="text"
                      placeholder="เลข 13 หลัก (ถ้ามี)"
                      value={customerTaxId}
                      onChange={(e) => setCustomerTaxId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ที่อยู่</label>
                    <input
                      type="text"
                      placeholder="ที่อยู่ผู้เช่า (ถ้ามี)"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Itemized Rows Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-resort-600" />
                    <span>รายการสินค้า / ค่าบริการ</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 bg-resort-50 hover:bg-resort-100 text-resort-700 rounded-lg font-bold text-[11px] border border-resort-200 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มแถวรายการ</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2">รายการ</th>
                        <th className="p-2 w-16 text-center">จำนวน</th>
                        <th className="p-2 w-16 text-center">หน่วย</th>
                        <th className="p-2 w-24 text-right">ราคา/หน่วย</th>
                        <th className="p-2 w-20 text-right">ส่วนลด</th>
                        <th className="p-2 w-24 text-right">รวมเงิน</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {itemRows.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              required
                              value={row.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="เช่น ค่าห้องพัก Deluxe 101"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min={1}
                              required
                              value={row.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              placeholder="งวด/คืน"
                              className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min={0}
                              required
                              value={row.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                              className="w-full px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded-lg font-bold"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="number"
                              min={0}
                              value={row.discount}
                              onChange={(e) => handleItemChange(idx, 'discount', Number(e.target.value))}
                              className="w-full px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded-lg text-red-600 font-medium"
                            />
                          </td>
                          <td className="p-2 text-right font-extrabold text-slate-900">
                            {formatCurrency(row.total)}
                          </td>
                          <td className="p-1.5 text-center">
                            {itemRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>รวมเป็นเงิน:</span>
                  <span className="font-semibold">{formatCurrency(subtotalAmount)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>ส่วนลดรวม:</span>
                    <span className="font-semibold">- {formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>รวมยอดเงินสุทธิ:</span>
                  <span className="text-base text-resort-700">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 pt-0.5">
                  ตัวหนังสือ: <span className="text-slate-800">({thaiBahtText(grandTotal)})</span>
                </div>
              </div>

              {/* Section 5: Issuer & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ผู้รับเงิน / ผู้มีอำนาจลงนาม</label>
                  <input
                    type="text"
                    value={issuerName}
                    onChange={(e) => setIssuerName(e.target.value)}
                    placeholder="สมบัติ รีสอร์ท"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมายเหตุบนใบเสร็จ</label>
                  <input
                    type="text"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingReceipt}
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceipt}
                  className="px-5 py-2.5 bg-resort-700 hover:bg-resort-800 text-white rounded-xl font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ReceiptIcon className="w-4 h-4" />
                  <span>{isSubmittingReceipt ? 'กำลังบันทึก...' : 'ยืนยันออกใบเสร็จรับเงิน'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADMIN IN-PAGE RECEIPT PREVIEW MODAL (OFFICIAL SOMBAT RESORT TAX RECEIPT)
          ========================================================================= */}
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
                  <span>พิมพ์ใบเสร็จ (A4)</span>
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
                {/* Left: Resort Info with Logo */}
                <div className="col-span-7 space-y-1">
                  <div className="flex items-center gap-3">
                    {/* Official Sombat Resort Logo from File โลโก้ 4151 */}
                    <div className="w-16 h-14 flex items-center justify-center flex-shrink-0">
                      <img
                        src="/logo-sombat.png"
                        alt="SOMBAT RESORT"
                        className="w-full h-full object-contain"
                      />
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

                {/* Right: Original Badge & Right-aligned Receipt Number / Date */}
                <div className="col-span-5 flex flex-col items-end justify-between">
                  <div className="border border-black px-6 py-1 text-center font-bold text-sm">
                    ต้นฉบับ
                  </div>

                  <div className="text-right space-y-1 mt-2 w-full flex flex-col items-end">
                    <div className="text-base font-bold tracking-wide">ใบเสร็จรับเงิน</div>
                    <div className="text-xs font-bold tracking-wider text-slate-700">RECEIPT</div>
                    <div className="pt-1.5 space-y-0.5 text-xs font-bold w-full flex flex-col items-end">
                      <div className="flex items-center justify-end gap-3 text-right">
                        <span className="text-slate-800">เล่มที่</span>
                        <span className="min-w-[65px] text-right font-black">
                          {(viewReceiptModal as any).customDetails?.book_no || '1'}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-3 text-right">
                        <span className="text-slate-800">เลขที่</span>
                        <span className="min-w-[65px] text-right font-black text-black">
                          {viewReceiptModal.receipt_number}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-3 text-right">
                        <span className="text-slate-800">วันที่</span>
                        <span className="text-right font-black text-black">
                          {formatDateThaiLong(viewReceiptModal.issued_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information Block */}
              {(() => {
                const custom = (viewReceiptModal as any).customDetails;
                const custName = custom?.customer_name || viewReceiptModal.booking?.customer?.full_name || 'ลูกค้าทั่วไป';
                const custPhone = custom?.customer_phone || viewReceiptModal.booking?.customer?.phone || '';
                const custAddress = custom?.customer_address || '-';
                const custTaxId = custom?.customer_tax_id || viewReceiptModal.booking?.customer?.id_card || '-';

                return (
                  <div className="my-3 space-y-1 text-xs">
                    <div className="flex gap-2">
                      <span className="font-bold min-w-[55px]">ลูกค้า :</span>
                      <span className="font-bold text-slate-950">
                        {custName.replace(/[^\w\s\u0E00-\u0E7F.,\-()/#]/g, '').trim()}
                      </span>
                    </div>

                    {custPhone && (
                      <div className="flex gap-2 text-[11px] text-slate-700">
                        <span className="min-w-[55px]">เบอร์โทร :</span>
                        <span>{custPhone}</span>
                      </div>
                    )}

                    <div className="flex gap-2 text-[11px] text-slate-700">
                      <span className="min-w-[55px]">ที่อยู่ :</span>
                      <span>{custAddress}</span>
                    </div>

                    <div className="flex gap-2 text-[11px] text-slate-700">
                      <span className="min-w-[55px]">เลขประจำตัวผู้เสียภาษี :</span>
                      <span>{custTaxId}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Items Table */}
              {(() => {
                const custom = (viewReceiptModal as any).customDetails;
                const customItems = custom?.items;
                const receiptItems = viewReceiptModal.receipt_items || [];
                const displayItems: Array<{ description: string; quantity: number; unit: string; unitPrice: number; discount: number; total: number }> =
                  Array.isArray(customItems) && customItems.length > 0
                    ? customItems
                    : receiptItems.length > 0
                    ? receiptItems.map((it: any) => ({
                        description: it.description,
                        quantity: 1,
                        unit: 'งวด',
                        unitPrice: Number(it.amount),
                        discount: 0,
                        total: Number(it.amount),
                      }))
                    : [
                        {
                          description: `ชำระค่าห้องพัก (Ref: ${viewReceiptModal.receipt_number})`,
                          quantity: 1,
                          unit: 'งวด',
                          unitPrice: Number(viewReceiptModal.amount),
                          discount: 0,
                          total: Number(viewReceiptModal.amount),
                        },
                      ];

                const totalAmt = Number(viewReceiptModal.amount);
                const subtotal = displayItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unitPrice) || Number(it.total) || 0), 0);
                const discount = displayItems.reduce((acc, it) => acc + (Number(it.discount) || 0), 0);

                const emptyRowsCount = Math.max(0, 2 - displayItems.length);

                return (
                  <div className="mt-3 border border-black overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-black text-center font-bold bg-white">
                          <th className="py-1.5 px-2 border-r border-black w-12">ลำดับ</th>
                          <th className="py-1.5 px-3 border-r border-black text-center">รายการ</th>
                          <th className="py-1.5 px-2 border-r border-black w-14 text-center">จำนวน</th>
                          <th className="py-1.5 px-2 border-r border-black w-14 text-center">หน่วย</th>
                          <th className="py-1.5 px-3 border-r border-black w-24 text-center">ราคา/หน่วย</th>
                          <th className="py-1.5 px-3 border-r border-black w-20 text-center">ส่วนลด</th>
                          <th className="py-1.5 px-3 w-28 text-center">จำนวนเงิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-black/30 text-xs">
                            <td className="py-1.5 px-2 border-r border-black text-center">{idx + 1}</td>
                            <td className="py-1.5 px-3 border-r border-black">{item.description}</td>
                            <td className="py-1.5 px-2 border-r border-black text-center">{item.quantity}</td>
                            <td className="py-1.5 px-2 border-r border-black text-center">{item.unit || 'งวด'}</td>
                            <td className="py-1.5 px-3 border-r border-black text-right">
                              {Number(item.unitPrice || item.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 px-3 border-r border-black text-center">
                              {Number(item.discount) > 0
                                ? Number(item.discount).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                                : '-'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-medium">
                              {Number(item.total).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}

                        {/* Empty padding rows for A4 balance */}
                        {Array.from({ length: emptyRowsCount }).map((_, i) => (
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
                            {subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        <tr className="border-t border-black text-xs">
                          <td className="py-1 px-3 border-r border-black text-center font-bold">ส่วนลด</td>
                          <td className="py-1 px-3 text-right font-medium">
                            {discount > 0 ? discount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                          </td>
                        </tr>

                        {/* Grand Total & Thai Baht Text row */}
                        <tr className="border-t-2 border-black font-bold text-xs bg-slate-100/70">
                          <td colSpan={5} className="py-2 px-4 border-r border-black text-center text-sm">
                            {thaiBahtText(totalAmt)}
                          </td>
                          <td className="py-2 px-3 border-r border-black text-center font-bold text-xs whitespace-nowrap">
                            รวมยอดเงินสุทธิ
                          </td>
                          <td className="py-2 px-3 text-right font-black text-sm">
                            {totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Footer Signature Box */}
              <div className="mt-6 print:mt-5 grid grid-cols-2 text-xs pt-2">
                <div>
                  <p className="text-[10px] text-slate-500">
                    * เอกสารนี้ออกโดยระบบอิเล็กทรอนิกส์ของรีสอร์ท
                  </p>
                  {(viewReceiptModal as any).customDetails?.user_notes && (
                    <p className="text-[10px] text-slate-600 mt-1">
                      หมายเหตุ: {(viewReceiptModal as any).customDetails?.user_notes}
                    </p>
                  )}
                </div>
                <div className="text-center space-y-6 print:space-y-4 ml-auto w-48">
                  <p className="font-bold text-xs">ผู้รับเงิน / ผู้มีอำนาจลงนาม</p>
                  <div className="border-b border-black"></div>
                  <p className="text-[11px] font-semibold text-slate-700">
                    ({(viewReceiptModal as any).customDetails?.issuer_name || viewReceiptModal.issuer?.full_name || settings?.resort_name || 'สมบัติ รีสอร์ท'})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Receipt Modal */}
      {cancelReceiptId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden no-print">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden no-print">
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
                  {(deleteReceiptModal as any).customDetails?.customer_name || deleteReceiptModal.booking?.customer?.full_name || '-'}
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
