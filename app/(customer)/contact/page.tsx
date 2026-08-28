'use client';

import React, { useState, useEffect } from 'react';
import { Settings } from '@/types/database';
import { MapPin, Phone, Mail, MessageCircle, Clock, Building2, Send } from 'lucide-react';

export default function ContactUsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-resort-600" />
          <span>ติดต่อเรา (Contact Us)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          สอบถามข้อมูลห้องพัก การเดินทาง หรือบริการเพิ่มเติม
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-xl bg-resort-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {settings?.resort_name || 'Paradise Resort & Spa'}
              </h2>
              <p className="text-xs text-resort-600 font-medium">LINE Official Booking</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">ที่อยู่</span>
                <span className="text-slate-600">{settings?.address}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">เบอร์โทรศัพท์</span>
                <a href={`tel:${settings?.phone}`} className="text-resort-700 font-bold hover:underline">
                  {settings?.phone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">อีเมล</span>
                <a href={`mailto:${settings?.email}`} className="text-slate-600 hover:underline">
                  {settings?.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">เวลาเช็คอิน / เช็คเอาท์</span>
                <span className="text-slate-600">
                  เช็คอินได้ตั้งแต่ {settings?.check_in_time || '14:00'} น. • เช็คเอาท์ก่อน {settings?.check_out_time || '12:00'} น.
                </span>
              </div>
            </div>
          </div>

          {/* LINE OA Button */}
          <div className="pt-2">
            <a
              href={`https://line.me/R/ti/p/${settings?.line_id || '@resort'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>แชทกับเราผ่าน LINE Official Account</span>
            </a>
          </div>
        </div>

        {/* Map / Resort Policy Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              นโยบายและระเบียบการเข้าพัก
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {settings?.policy_terms || 'กรุณาแสดงบัตรประชาชนหรือหนังสือเดินทางในวันเข้าพัก ไม่อนุญาตให้สูบบุหรี่ภายในห้องพัก และกรุณารักษาความสงบหลังเวลา 22:00 น.'}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
            <div className="text-2xl">🗺️</div>
            <div className="text-xs font-bold text-slate-800">แผนที่และการเดินทาง</div>
            <div className="text-[11px] text-slate-500">
              สะดวกสบาย ใกล้แหล่งท่องเที่ยวชั้นนำ พร้อมที่จอดรถส่วนตัวฟรี
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
