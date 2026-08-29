'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Booking, Settings } from '@/types/database';
import { formatCurrency, formatDateThai, formatDateTime, formatPhone } from '@/lib/formatters';
import { generateBookingVoucherPdf } from '@/lib/pdf-generator';
import liff from '@line/liff';
import {
  Building2,
  Calendar,
  CreditCard,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ChevronRight,
  ShieldCheck,
  Receipt as ReceiptIcon,
  Search,
  ExternalLink,
  Share2,
} from 'lucide-react';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === 'undefined' || id === 'null' || id === 'bookings') {
      router.replace('/bookings');
      return;
    }

    fetch(`/api/bookings/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.booking) {
          setBooking(d.booking);
        }
      })
      .catch((err) => console.error('Failed to load booking:', err))
      .finally(() => setIsLoading(false));

    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});
  }, [id, router]);

  // Open in default mobile browser (Safari / Chrome) for full native download & print
  const handleOpenInExternalBrowser = () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    try {
      if (liff && liff.isInClient && liff.isInClient()) {
        liff.openWindow({ url: currentUrl, external: true });
        return;
      }
    } catch {
      // fallback
    }
    window.open(currentUrl, '_blank');
  };

  const handleDownloadPdf = () => {
    if (!booking || !settings) return;
    setIsDownloadingPdf(true);
    setDownloadNote(null);
    try {
      const doc = generateBookingVoucherPdf(booking, settings);
      const fileName = `Voucher_${booking.booking_number}.pdf`;
      doc.save(fileName);

      // Also create a data blob link fallback for mobile webviews
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);

      // If inside LINE in-app webview
      const isLine = typeof navigator !== 'undefined' && /Line/i.test(navigator.userAgent);
      if (isLine) {
        setDownloadNote(
          '💡 หากดาวน์โหลดใน LINE ไม่ขึ้น แนะนำกดปุ่ม "เปิดใน Safari / Chrome" ด้านขวา เพื่อดาวน์โหลดหรือพิมพ์ได้ทันทีครับ'
        );
        window.open(blobUrl, '_blank');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setDownloadNote('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    try {
      window.print();
    } catch {
      handleOpenInExternalBrowser();
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-resort-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-4">กำลังโหลดใบยืนยันการจอง...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center bg-white rounded-3xl border border-slate-200 mt-8 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">ไม่พบข้อมูลการจองนี้</h2>
          <p className="text-xs text-slate-500 mt-1">
            รหัสการจองอาจไม่ถูกต้อง หรือคุณยังไม่ได้ทำการจองห้องพักในระบบ
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/bookings"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            ดูการจองทั้งหมดของฉัน
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 bg-resort-700 hover:bg-resort-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>ค้นหาและจองห้องพัก</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Top Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden no-print">
        <div>
          <span className="text-xs font-semibold text-resort-600 uppercase tracking-wider">
            Booking Confirmation
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">
            ใบยืนยันการจองห้องพัก (Voucher)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-resort-600" />
            <span>{isDownloadingPdf ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>พิมพ์</span>
          </button>

          <button
            onClick={handleOpenInExternalBrowser}
            title="เปิดใน Safari หรือ Google Chrome"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
            <span>เปิดเบราว์เซอร์</span>
          </button>

          {Number(booking.remaining_balance) > 0 && booking.status !== 'CANCELLED' && (
            <Link
              href={`/bookings/${booking.id}/payment`}
              className="px-4 py-2 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>ชำระเงิน</span>
            </Link>
          )}
        </div>
      </div>

      {downloadNote && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-2 shadow-sm animate-in fade-in print:hidden no-print">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{downloadNote}</span>
        </div>
      )}

      {/* Main Voucher Printable Box */}
      <div id="voucher-card" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        {/* Resort Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-resort-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {settings?.resort_name || 'สมบัติ รีสอร์ท'}
              </h2>
              <p className="text-xs text-slate-500">
                {settings?.address} • โทร: {settings?.phone}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs font-medium text-slate-400">เลขที่ใบจอง (Booking Ref)</div>
            <div className="text-base font-extrabold text-resort-700">{booking.booking_number}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              วันที่ออก: {formatDateTime(booking.created_at)}
            </div>
          </div>
        </div>

        {/* Status Alert Banner */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-resort-600" />
            <span className="text-xs font-semibold text-slate-600">สถานะการจอง:</span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold ${
              booking.status === 'CONFIRMED'
                ? 'bg-green-100 text-green-700'
                : booking.status === 'PENDING'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {booking.status === 'CONFIRMED'
              ? 'ยืนยันการจองเรียบร้อย'
              : booking.status === 'PENDING'
              ? 'รอชำระเงิน / รอตรวจสอบสลิป'
              : booking.status}
          </span>
        </div>

        {/* 2-Column Guest & Stay Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
            <div className="font-bold text-resort-700 uppercase tracking-wider text-[11px]">
              ข้อมูลผู้เข้าพัก (Guest Details)
            </div>
            <div><span className="text-slate-500">ชื่อ-นามสกุล:</span> <span className="font-semibold text-slate-800">{booking.customer?.full_name || '-'}</span></div>
            <div><span className="text-slate-500">เบอร์โทรศัพท์:</span> <span className="font-semibold text-slate-800">{formatPhone(booking.customer?.phone)}</span></div>
            <div><span className="text-slate-500">อีเมล:</span> <span className="font-semibold text-slate-800">{booking.customer?.email || '-'}</span></div>
            <div><span className="text-slate-500">จำนวนผู้เข้าพัก:</span> <span className="font-semibold text-slate-800">{booking.num_guests} ท่าน</span></div>
          </div>

          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
            <div className="font-bold text-resort-700 uppercase tracking-wider text-[11px]">
              รายละเอียดการเข้าพัก (Stay Details)
            </div>
            <div><span className="text-slate-500">วันเช็คอิน:</span> <span className="font-semibold text-slate-800">{formatDateThai(booking.check_in_date)} ({settings?.check_in_time ? settings.check_in_time.slice(0, 5) : '14:00'} น.)</span></div>
            <div><span className="text-slate-500">วันเช็คเอาท์:</span> <span className="font-semibold text-slate-800">{formatDateThai(booking.check_out_date)} ({settings?.check_out_time ? settings.check_out_time.slice(0, 5) : '12:00'} น.)</span></div>
            <div><span className="text-slate-500">ระยะเวลา:</span> <span className="font-bold text-resort-700">{booking.total_nights} คืน</span></div>
          </div>
        </div>

        {/* Room Items Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            รายการห้องพักที่จอง
          </h3>
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="p-3">ห้องพัก</th>
                  <th className="p-3 text-right">ราคาต่อคืน</th>
                  <th className="p-3 text-center">จำนวนคืน</th>
                  <th className="p-3 text-right">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(booking.booking_items || []).map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium text-slate-800">
                      {item.room_name} <span className="text-slate-400 font-normal">(ห้อง {item.room_number})</span>
                    </td>
                    <td className="p-3 text-right text-slate-600">{formatCurrency(item.price_per_night)}</td>
                    <td className="p-3 text-center text-slate-600">{item.nights}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{formatCurrency(item.item_subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price Breakdown Calculation */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs max-w-sm ml-auto">
          <div className="flex justify-between text-slate-600">
            <span>ราคารวมห้องพัก:</span>
            <span>{formatCurrency(booking.subtotal_amount)}</span>
          </div>

          {Number(booking.promotion_discount) > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span>ส่วนลดโปรโมชั่น:</span>
              <span>-{formatCurrency(booking.promotion_discount)}</span>
            </div>
          )}

          {Number(booking.manual_discount) > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span>ส่วนลดพิเศษ:</span>
              <span>-{formatCurrency(booking.manual_discount)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-900 font-extrabold text-base pt-2 border-t border-slate-200">
            <span>ยอดสุทธิ (Net Total):</span>
            <span className="text-resort-700">{formatCurrency(booking.net_total)}</span>
          </div>

          <div className="flex justify-between text-green-700 font-bold">
            <span>ชำระแล้ว (Paid):</span>
            <span>{formatCurrency(booking.paid_amount)}</span>
          </div>

          <div className="flex justify-between text-red-600 font-extrabold text-sm pt-1 border-t border-slate-200">
            <span>ยอดคงเหลือที่ต้องชำระ:</span>
            <span>{formatCurrency(booking.remaining_balance)}</span>
          </div>
        </div>

        {/* Policy Terms */}
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
          <div className="font-bold text-slate-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-resort-600" />
            <span>เงื่อนไขและนโยบายรีสอร์ท</span>
          </div>
          <p>{settings?.policy_terms || 'กรุณาแสดงใบยืนยันการจองนี้พร้อมบัตรประชาชนหรือหนังสือเดินทางในวันเข้าพัก'}</p>
        </div>
      </div>

      {/* Payment & Receipts History Section */}
      {booking.payments && booking.payments.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 no-print">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-resort-600" />
            <span>ประวัติการชำระเงินและใบเสร็จ (Payments & Receipts)</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {booking.payments.map((p) => {
              const matchedReceipt = booking.receipts?.find((r) => r.payment_id === p.id && r.status === 'ISSUED');
              return (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">
                      ชำระ {formatCurrency(p.amount)} ({p.payment_type})
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {p.payment_method} • {formatDateTime(p.created_at)} • สถานะ: <span className="font-semibold text-slate-700">{p.status}</span>
                    </div>
                  </div>

                  <div>
                    {matchedReceipt ? (
                      <Link
                        href={`/receipts/${matchedReceipt.id}`}
                        className="px-3 py-1.5 bg-resort-50 hover:bg-resort-100 text-resort-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-resort-200"
                      >
                        <FileText className="w-3 h-3" />
                        <span>ใบเสร็จรับเงิน #{matchedReceipt.receipt_number}</span>
                      </Link>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {p.status === 'PENDING' ? 'กำลังตรวจสอบสลิป' : 'รอออกใบเสร็จ'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
