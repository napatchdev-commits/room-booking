'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Booking, Settings } from '@/types/database';
import { formatCurrency } from '@/lib/formatters';
import { CreditCard, Upload, CheckCircle2, AlertCircle, Building2, QrCode, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payment Form States
  const [paymentOption, setPaymentOption] = useState<'FULL' | 'DEPOSIT' | 'CUSTOM'>('FULL');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'PROMPTPAY_QR'>('BANK_TRANSFER');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (!id || id === 'undefined' || id === 'null') return;

    fetch(`/api/bookings/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.booking) {
          setBooking(d.booking);
          setCustomAmount(Number(d.booking.remaining_balance));
        }
      })
      .catch((err) => console.error('Failed to fetch booking for payment:', err))
      .finally(() => setIsLoading(false));

    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});
  }, [id]);

  const remainingBalance = Number(booking?.remaining_balance || 0);
  const deposit50 = Math.round((Number(booking?.net_total || 0) * 0.5) * 100) / 100;

  const getPayAmount = () => {
    if (paymentOption === 'FULL') return remainingBalance;
    if (paymentOption === 'DEPOSIT') return Math.min(deposit50, remainingBalance);
    return customAmount;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    const amountToPay = getPayAmount();
    if (amountToPay <= 0) {
      setErrorMsg('ยอดชำระต้องมากกว่า 0 บาท');
      return;
    }

    if (!slipPreview) {
      setErrorMsg('กรุณาแนบสลิปหลักฐานการโอนเงิน');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // In production with Supabase Storage, slip is uploaded to bucket or stored as data URI
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: amountToPay,
          paymentType: paymentOption === 'FULL' ? 'FULL' : paymentOption === 'DEPOSIT' ? 'DEPOSIT' : 'INSTALLMENT',
          paymentMethod,
          slipUrl: slipPreview, // base64 / storage URL
          notes,
          actorName: booking.customer?.full_name || 'Customer',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to submit payment');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(true);
      setTimeout(() => {
        router.push(`/bookings/${booking.id}`);
      }, 1500);
    } catch (err) {
      console.error('Payment submit error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการส่งข้อมูล');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-resort-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-slate-500 mt-4">กำลังโหลดข้อมูลชำระเงิน...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm text-red-600 font-bold">ไม่พบข้อมูลการจอง</p>
      </div>
    );
  }

  const bankAccount = settings?.bank_accounts?.[0] || {
    bank_name: 'ธนาคารกสิกรไทย (KBank)',
    account_number: '123-4-56789-0',
    account_name: settings?.resort_name || 'Paradise Resort Co., Ltd.',
    promptpay_id: settings?.phone || '0899999999',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <Link
        href={`/bookings/${booking.id}`}
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปที่ใบจอง #{booking.booking_number}</span>
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-resort-600" />
          <span>ชำระเงิน & แนบสลิปโอนเงิน</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          การจองเลขที่: <span className="font-bold text-slate-800">{booking.booking_number}</span> • ยอดคงเหลือ:{' '}
          <span className="font-extrabold text-red-600">{formatCurrency(remainingBalance)}</span>
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว กำลังนำท่านกลับไปหน้าใบจอง...</span>
        </div>
      )}

      <form onSubmit={handleSubmitPayment} className="space-y-6">
        {/* Step 1: Full Payment Summary */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
            <span>1. ยอดที่ต้องชำระ (ชำระยอดเต็มจำนวน)</span>
            <span className="text-xs font-semibold text-resort-600 bg-resort-50 px-2.5 py-1 rounded-full border border-resort-200">
              ชำระยอดเต็ม 100%
            </span>
          </h2>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-resort-50/80 to-white border-2 border-resort-600/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-700">ยอดชำระค่าห้องพักสุทธิ</div>
              <div className="text-[11px] text-slate-500 mt-0.5">รวมภาษีและค่าบริการทั้งหมดแล้ว</div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-resort-700">
              {formatCurrency(remainingBalance)}
            </div>
          </div>
        </div>

        {/* Step 2: Resort Bank Account / PromptPay QR */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
            <span>2. สแกน QR Code หรือโอนผ่านบัญชีธนาคาร</span>
            <span className="text-xs font-extrabold text-resort-700">
              ยอดโอน: {formatCurrency(getPayAmount())}
            </span>
          </h2>

          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
            {/* Real PromptPay QR Image from user upload */}
            <div className="w-48 sm:w-52 bg-white p-3 rounded-2xl border border-slate-200 shadow-md flex flex-col items-center justify-center flex-shrink-0">
              <img
                src="/payment-qr.jpg"
                alt="สแกน QR เพื่อชำระเงิน"
                className="w-full h-auto object-contain rounded-xl"
              />
              <div className="mt-2 text-center">
                <span className="text-[11px] font-extrabold text-slate-800 block">
                  สแกน QR เพื่อชำระเงิน
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ยอด {formatCurrency(getPayAmount())}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-center sm:text-left flex-1">
              <div className="font-extrabold text-slate-900 text-sm">{bankAccount.bank_name}</div>
              <div>
                <span className="text-slate-500">เลขที่บัญชี:</span>{' '}
                <span className="font-black text-slate-900 text-sm tracking-wide bg-white px-2.5 py-1 rounded-lg border border-slate-200 inline-block mt-0.5 select-all">
                  {bankAccount.account_number}
                </span>
              </div>
              <div>
                <span className="text-slate-500">ชื่อบัญชี:</span>{' '}
                <span className="font-bold text-slate-800">{bankAccount.account_name}</span>
              </div>
              {bankAccount.promptpay_id && (
                <div>
                  <span className="text-slate-500">พร้อมเพย์:</span>{' '}
                  <span className="font-bold text-slate-800">{bankAccount.promptpay_id}</span>
                </div>
              )}
              <div className="pt-2 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                💡 สามารถแคปหน้าจอรูป QR Code หรือสแกนเพื่อโอนเงินผ่านแอปธนาคาร จากนั้นแนบรูปสลิปในขั้นตอนที่ 3 ด้านล่าง
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Upload Slip */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            3. แนบหลักฐานการโอนเงิน (สลิป) <span className="text-red-500">*</span>
          </h2>

          <div className="border-2 border-dashed border-slate-300 hover:border-resort-500 rounded-2xl p-6 text-center transition-colors">
            {slipPreview ? (
              <div className="space-y-3">
                <img
                  src={slipPreview}
                  alt="Slip preview"
                  className="max-h-60 mx-auto rounded-xl shadow-md object-contain border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSlipFile(null);
                    setSlipPreview(null);
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-800"
                >
                  เปลี่ยนรูปสลิป
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block space-y-2">
                <div className="w-12 h-12 rounded-full bg-resort-50 text-resort-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  คลิกเพื่อเลือกรูปภาพสลิป หรือถ่ายรูป
                </div>
                <div className="text-[11px] text-slate-400">
                  รองรับไฟล์ JPG, PNG (สลิปต้องเห็นยอดเงินและเวลาชัดเจน)
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              หมายเหตุเพิ่มเติม (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น โอนจากบัญชีธนาคารไทยพาณิชย์"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-resort-500/20"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || successMsg}
          className="w-full py-4 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-resort-600/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>ส่งหลักฐานการชำระเงิน {formatCurrency(getPayAmount())}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
