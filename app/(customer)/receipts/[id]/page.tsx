'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Receipt, Settings } from '@/types/database';
import { formatCurrency, formatDateThaiLong, thaiBahtText } from '@/lib/formatters';
import { Printer, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function CustomerReceiptDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [rRes, sRes] = await Promise.all([
          fetch(`/api/receipts/${id}`),
          fetch('/api/settings', { cache: 'no-store' }),
        ]);

        const rData = await rRes.json();
        const sData = await sRes.json();

        if (rData.success && rData.receipt) {
          setReceipt(rData.receipt);
        }
        if (sData.success && sData.settings) {
          setSettings(sData.settings);
        }
      } catch (err) {
        console.error('Failed to load receipt:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-xs text-slate-400">
        กำลังโหลดข้อมูลใบเสร็จรับเงิน...
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center bg-white rounded-3xl border border-slate-200 mt-8 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-slate-800">ไม่พบข้อมูลใบเสร็จรับเงิน</h2>
        <p className="text-xs text-slate-500">
          รหัสใบเสร็จไม่ถูกต้อง หรือยังไม่ได้ทำการออกใบเสร็จสำหรับรายการนี้
        </p>
        <Link
          href="/bookings"
          className="inline-block px-5 py-2.5 bg-resort-700 hover:bg-resort-800 text-white rounded-xl text-xs font-bold transition-colors"
        >
          กลับไปที่การจองของฉัน
        </Link>
      </div>
    );
  }

  const booking = receipt.booking;
  const custom = (receipt as any).customDetails;
  const rawCustomerName =
    custom?.customer_name || booking?.customer?.full_name || 'ลูกค้าทั่วไป';
  const cleanCustomerName =
    rawCustomerName.replace(/[^\w\s\u0E00-\u0E7F.,\-()/#]/g, '').trim() || rawCustomerName;
  const customerPhone = custom?.customer_phone || booking?.customer?.phone || '';
  const customerAddress = custom?.customer_address || '-';
  const customerTaxId = custom?.customer_tax_id || booking?.customer?.id_card || '-';
  const bookNo = custom?.book_no || '1';
  const issuerName = custom?.issuer_name || receipt.issuer?.full_name || settings?.resort_name || 'สมบัติ รีสอร์ท';

  // Format item rows
  const customItems = custom?.items;
  const receiptItems = receipt.receipt_items || [];
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
            description: `ชำระค่าห้องพัก (Ref: ${receipt.receipt_number})`,
            quantity: 1,
            unit: 'งวด',
            unitPrice: Number(receipt.amount),
            discount: 0,
            total: Number(receipt.amount),
          },
        ];

  const totalAmount = Number(receipt.amount || 0);
  const subtotal = displayItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unitPrice) || Number(it.total) || 0), 0);
  const discount = displayItems.reduce((acc, it) => acc + (Number(it.discount) || 0), 0);
  const emptyRowsCount = Math.max(0, 2 - displayItems.length);

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
            <span>พิมพ์ใบเสร็จ / บันทึก PDF (A4)</span>
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

      {/* Official Tax Receipt Document Container (Exact Sombat Resort Layout) */}
      <div
        id="receipt-print-area"
        className="bg-white text-black p-6 sm:p-10 border border-black shadow-md mx-auto print:border-0 print:p-0 print:shadow-none font-sans text-xs leading-relaxed"
        style={{ maxWidth: '820px' }}
      >
        {/* Top Header Grid */}
        <div className="grid grid-cols-12 gap-2 pb-2">
          {/* Left: Resort Info with Official Logo 4151 */}
          <div className="col-span-8 space-y-1">
            <div className="flex items-center gap-3">
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
                <span>{bookNo}</span>
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

          {customerPhone && (
            <div className="flex gap-2 text-[11px] text-slate-700">
              <span className="min-w-[55px]">เบอร์โทร :</span>
              <span>{customerPhone}</span>
            </div>
          )}

          <div className="flex gap-2 text-[11px] text-slate-700">
            <span className="min-w-[55px]">ที่อยู่ :</span>
            <span>{customerAddress}</span>
          </div>

          <div className="flex gap-2 text-[11px] text-slate-700">
            <span className="min-w-[55px]">เลขประจำตัวผู้เสียภาษี :</span>
            <span>{customerTaxId}</span>
          </div>
        </div>

        {/* Items Table */}
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

              {/* Empty padding rows for compact A4 fit */}
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
            {custom?.user_notes && (
              <p className="text-[10px] text-slate-600 mt-1">
                หมายเหตุ: {custom.user_notes}
              </p>
            )}
          </div>
          <div className="text-center space-y-6 print:space-y-4 ml-auto w-48">
            <p className="font-bold text-xs">ผู้รับเงิน / ผู้มีอำนาจลงนาม</p>
            <div className="border-b border-black"></div>
            <p className="text-[11px] font-semibold text-slate-700">
              ({issuerName})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
