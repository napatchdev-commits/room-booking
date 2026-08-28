'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Receipt, Settings } from '@/types/database';
import { formatCurrency, formatDateTime, formatPhone } from '@/lib/formatters';
import { generateReceiptPdf } from '@/lib/pdf-generator';
import {
  Building2,
  Download,
  Printer,
  Receipt as ReceiptIcon,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function ReceiptViewPage() {
  const params = useParams();
  const id = params.id as string;

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/receipts?paymentId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.receipts && d.receipts.length > 0) {
          setReceipt(d.receipts[0]);
        } else {
          // fetch by receipt ID directly
          fetch(`/api/receipts`)
            .then((r2) => r2.json())
            .then((d2) => {
              const matched = d2.receipts?.find((r: Receipt) => r.id === id || r.receipt_number === id);
              if (matched) setReceipt(matched);
            });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});
  }, [id]);

  const handleDownloadPdf = () => {
    if (!receipt || !settings) return;
    setIsDownloadingPdf(true);
    try {
      const doc = generateReceiptPdf(receipt, settings);
      doc.save(`Receipt_${receipt.receipt_number}.pdf`);
    } catch (err) {
      console.error('Receipt PDF error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-resort-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-4">กำลังโหลดใบเสร็จรับเงิน...</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center bg-white rounded-2xl border border-slate-200 mt-8 shadow-sm">
        <ReceiptIcon className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 mt-3">ไม่พบข้อมูลใบเสร็จ</h2>
        <p className="text-xs text-slate-500 mt-1">ใบเสร็จอาจยังไม่ถูกออกโดยเจ้าหน้าที่ หรือรหัสไม่ถูกต้อง</p>
        <Link
          href="/bookings"
          className="inline-block mt-4 px-4 py-2 bg-resort-600 text-white rounded-xl text-xs font-bold"
        >
          กลับหน้ารายการจอง
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <Link
          href={`/bookings/${receipt.booking_id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปที่ใบจอง</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-resort-600" />
            <span>{isDownloadingPdf ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>พิมพ์ใบเสร็จ</span>
          </button>
        </div>
      </div>

      {/* Main Receipt Printable Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-resort-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {settings?.resort_name || 'Paradise Resort & Spa'}
              </h2>
              <p className="text-xs text-slate-500">
                {settings?.address} • โทร: {settings?.phone}
              </p>
              {settings?.tax_id && (
                <p className="text-[11px] text-slate-400">เลขประจำตัวผู้เสียภาษี: {settings.tax_id}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-bold text-resort-600 uppercase tracking-wider block">
              OFFICIAL RECEIPT
            </span>
            <div className="text-lg font-extrabold text-slate-900">{receipt.receipt_number}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              วันที่ออก: {formatDateTime(receipt.issued_at)}
            </div>
          </div>
        </div>

        {/* Cancelled Banner */}
        {receipt.status === 'CANCELLED' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div>
              <span className="font-bold">[ ใบเสร็จนี้ถูกยกเลิกแล้ว ]</span>
              {receipt.cancel_reason && <span> เหตุผล: {receipt.cancel_reason}</span>}
            </div>
          </div>
        )}

        {/* Customer & Booking Details */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
          <div className="font-bold text-resort-700 uppercase tracking-wider text-[11px]">
            ข้อมูลผู้ชำระเงิน (Customer Information)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><span className="text-slate-500">ชื่อผู้ชำระ:</span> <span className="font-semibold text-slate-800">{receipt.booking?.customer?.full_name || 'Guest'}</span></div>
            <div><span className="text-slate-500">เบอร์โทรศัพท์:</span> <span className="font-semibold text-slate-800">{formatPhone(receipt.booking?.customer?.phone)}</span></div>
            <div><span className="text-slate-500">รหัสการจอง:</span> <span className="font-semibold text-slate-800">{receipt.booking?.booking_number}</span></div>
            <div><span className="text-slate-500">วิธีชำระ:</span> <span className="font-semibold text-slate-800">{receipt.payment?.payment_method || 'BANK_TRANSFER'}</span></div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">รายการชำระเงิน (Description)</th>
                <th className="p-3 text-right">จำนวนเงิน (THB)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3">1</td>
                <td className="p-3 font-medium text-slate-800">
                  ชำระค่าห้องพัก ({receipt.payment?.payment_type}) - รหัสการจอง {receipt.booking?.booking_number}
                </td>
                <td className="p-3 text-right font-extrabold text-slate-900 text-sm">
                  {formatCurrency(receipt.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Summary */}
        <div className="bg-resort-50 rounded-xl p-4 border border-resort-200 flex items-center justify-between">
          <span className="text-sm font-bold text-resort-900">รวมยอดเงินที่ได้รับชำระ (Total Paid):</span>
          <span className="text-xl font-extrabold text-resort-700">{formatCurrency(receipt.amount)}</span>
        </div>

        {/* Signatures */}
        <div className="pt-8 border-t border-slate-100 flex justify-between items-end text-xs text-slate-500">
          <div className="text-[11px]">
            <p>เอกสารออกโดยระบบคอมพิวเตอร์</p>
            <p>Paradise Resort & Spa Management</p>
          </div>

          <div className="text-center space-y-1">
            <div className="w-36 border-b border-slate-300 pb-1 font-semibold text-slate-800">
              {receipt.issuer?.full_name || 'เจ้าหน้าที่รีสอร์ท'}
            </div>
            <div className="text-[11px] text-slate-400">ผู้รับเงิน / ออกใบเสร็จ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
