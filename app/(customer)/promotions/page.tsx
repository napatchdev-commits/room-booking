'use client';

import React, { useState, useEffect } from 'react';
import { Promotion } from '@/types/database';
import { formatCurrency, formatDateThai } from '@/lib/formatters';
import { Sparkles, Tag, Calendar, BedDouble, Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function PromotionsCustomerPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/promotions?activeOnly=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.promotions) {
          setPromotions(d.promotions);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-orange-500" />
          <span>โปรโมชั่นและข้อเสนอพิเศษ (Special Deals)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          รับส่วนลดห้องพักสุดคุ้ม เมื่อจองผ่าน LINE LIFF วันนี้
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4 py-8">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="text-3xl">🎁</div>
          <h3 className="text-base font-bold text-slate-800">
            ยังไม่มีโปรโมชั่นในช่วงเวลานี้
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ติดตามโปรโมชั่นใหม่ๆ ได้ทาง LINE Official Account ของเรา
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-resort-600 hover:bg-resort-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <span>ค้นหาห้องพัก</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-2xl border border-orange-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-orange-100 text-orange-700">
                  <Tag className="w-3 h-3" />
                  <span>
                    {promo.discount_type === 'PERCENTAGE'
                      ? `ลด ${promo.discount_value}%`
                      : `ลด ${formatCurrency(promo.discount_value)}`}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{promo.name}</h3>

                {promo.description && (
                  <p className="text-xs text-slate-600">{promo.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-resort-600" />
                    <span>
                      ใช้ได้ถึง: {formatDateThai(promo.end_date)}
                    </span>
                  </div>
                  {promo.min_nights > 1 && (
                    <div className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-resort-600" />
                      <span>พักขั้นต่ำ {promo.min_nights} คืน</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Code Box & Actions */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  onClick={() => handleCopyCode(promo.code)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors"
                >
                  {copiedCode === promo.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-green-600">คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>โค้ด: <span className="text-resort-700 font-extrabold">{promo.code}</span></span>
                    </>
                  )}
                </button>

                <Link
                  href={`/?promo=${promo.code}`}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all"
                >
                  ใช้โปรโมชั่นนี้
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
