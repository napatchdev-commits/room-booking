'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Receipt, Settings } from '@/types/database';
import { formatDateThaiLong, thaiBahtText } from '@/lib/formatters';
import {
  Download,
  Printer,
  Receipt as ReceiptIcon,
  AlertTriangle,
  ArrowLeft,
  Palmtree,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function ReceiptViewPage() {
  const params = useParams();
  const id = params.id as string;

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/receipts?paymentId=${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.receipts && d.receipts.length > 0) {
          setReceipt(d.receipts[0]);
        } else {
          // fetch by receipt ID directly
          fetch(`/api/receipts`, { cache: 'no-store' })
            .then((r2) => r2.json())
            .then((d2) => {
              const matched = d2.receipts?.find(
                (r: Receipt) => r.id === id || r.receipt_number === id
              );
              if (matched) setReceipt(matched);
            });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-4 font-sans">กำลังโหลดใบเสร็จรับเงิน...</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center bg-white rounded-2xl border border-slate-200 mt-8 shadow-sm">
        <ReceiptIcon className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 mt-3 font-sans">ไม่พบข้อมูลใบเสร็จ</h2>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          ใบเสร็จอาจยังไม่ถูกออกโดยเจ้าหน้าที่ หรือรหัสไม่ถูกต้อง
        </p>
        <Link
          href="/bookings"
          className="inline-block mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold font-sans"
        >
          กลับหน้ารายการจอง
        </Link>
      </div>
    );
  }

  const booking = receipt.booking;
  const customer = booking?.customer;
  const rawCustomerName = customer?.full_name || 'ลูกค้าทั่วไป';
  const cleanCustomerName = rawCustomerName.replace(/[^\w\s\u0E00-\u0E7F.,\-()/#]/g, '').trim() || rawCustomerName;
  const items = booking?.booking_items || [];
  const totalAmount = Number(receipt.amount || booking?.net_total || 0);
  const subtotal = Number(booking?.subtotal_amount || totalAmount);
  const discount = Number(booking?.promotion_discount || 0) + Number(booking?.manual_discount || 0);

  // Pad empty rows to create official 5-row table layout
  const emptyRowsCount = Math.max(0, 4 - items.length);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6 md:py-10 space-y-6">
      {/* Top Action Buttons (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden no-print">
        <Link
          href={booking ? `/bookings/${booking.id}` : '/bookings'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปที่ใบยืนยันการจอง</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบเสร็จ / บันทึก PDF</span>
          </button>
        </div>
      </div>

      {/* Cancelled Banner if applicable */}
      {receipt.status === 'CANCELLED' && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 print:hidden no-print">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="font-bold">[ ใบเสร็จนี้ถูกยกเลิกแล้ว ]</span>
            {receipt.cancel_reason && <span> เหตุผล: {receipt.cancel_reason}</span>}
          </div>
        </div>
      )}

      {/* Official Tax Receipt Document Container (Exact Layout from Image) */}
      <div
        id="receipt-print-area"
        className="bg-white text-black p-6 sm:p-10 border border-black shadow-md mx-auto print:border-0 print:p-0 print:shadow-none font-sans text-xs leading-relaxed"
        style={{ maxWidth: '820px' }}
      >
        {/* Top Header Grid */}
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
            {/* Boxed Original Badge */}
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
                <span>{receipt.receipt_number}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span>วันที่</span>
                <span>{formatDateThaiLong(receipt.issued_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information Block */}
        <div className="my-3 space-y-1 text-xs">
          <div className="flex gap-2">
            <span className="font-bold min-w-[55px]">ลูกค้า :</span>
            <span className="font-bold text-slate-950">
              {cleanCustomerName}
            </span>
          </div>

          {customer?.phone && (
            <div className="flex gap-2 text-[11px] text-slate-700">
              <span className="min-w-[55px]">เบอร์โทร :</span>
              <span>{customer.phone}</span>
            </div>
          )}

          <div className="flex gap-2 text-[11px] text-slate-700">
            <span className="min-w-[55px]">ที่อยู่ :</span>
            <span>-</span>
          </div>

          <div className="flex gap-2 text-[11px] text-slate-700">
            <span className="min-w-[55px]">เลขประจำตัวผู้เสียภาษี :</span>
            <span>{customer?.id_card || '-'}</span>
          </div>
        </div>

        {/* Official Items Table */}
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
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-black/30 text-xs">
                    <td className="py-2 px-2 border-r border-black text-center">{idx + 1}</td>
                    <td className="py-2 px-3 border-r border-black">
                      ค่าเช่าห้องพัก {item.room_name} (ห้อง {item.room_number})
                    </td>
                    <td className="py-2 px-2 border-r border-black text-center">{item.nights}</td>
                    <td className="py-2 px-2 border-r border-black text-center">คืน</td>
                    <td className="py-2 px-3 border-r border-black text-right">
                      {Number(item.price_per_night).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 border-r border-black text-center">-</td>
                    <td className="py-2 px-3 text-right font-medium">
                      {Number(item.item_subtotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-black/30 text-xs">
                  <td className="py-2 px-2 border-r border-black text-center">1</td>
                  <td className="py-2 px-3 border-r border-black">
                    ชำระค่าห้องพัก (Ref: {booking?.booking_number || receipt.receipt_number})
                  </td>
                  <td className="py-2 px-2 border-r border-black text-center">1</td>
                  <td className="py-2 px-2 border-r border-black text-center">งวด</td>
                  <td className="py-2 px-3 border-r border-black text-right">
                    {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 border-r border-black text-center">-</td>
                  <td className="py-2 px-3 text-right font-medium">
                    {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* Empty padding rows to maintain visual height (2 rows for compact A4 fit) */}
              {Array.from({ length: Math.min(2, Math.max(0, 3 - items.length)) }).map((_, i) => (
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
                  {discount > 0
                    ? discount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                    : '-'}
                </td>
              </tr>

              {/* Grand Total & Thai Baht Text row */}
              <tr className="border-t-2 border-black font-bold text-xs bg-slate-100/70">
                <td colSpan={5} className="py-2 px-4 border-r border-black text-center text-sm">
                  {thaiBahtText(totalAmount)}
                </td>
                <td className="py-2 px-3 border-r border-black text-center font-bold text-xs whitespace-nowrap">
                  รวมยอดเงินสุทธิ
                </td>
                <td className="py-2 px-3 text-right font-black text-sm">
                  {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
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
              ({receipt.issuer?.full_name || settings?.resort_name || 'สมบัติ รีสอร์ท'})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
