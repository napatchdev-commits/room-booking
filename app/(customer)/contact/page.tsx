'use client';

import React, { useState, useEffect } from 'react';
import { Settings } from '@/types/database';
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Building2,
  Send,
  Navigation,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export default function ContactUsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const resortName = settings?.resort_name || 'สมบัติ รีสอร์ท';
  const address = settings?.address || '45/3 หมู่ที่ 8 ต.ราษฎร์นิยม อ.ไทรน้อย จ.นนทบุรี 11150';

  // Build high-accuracy Google Maps search & embed query
  const mapQuery = encodeURIComponent(`${resortName} ${address}`);
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-resort-600" />
          <span>ติดต่อเรา & แผนที่การเดินทาง (Contact & Location)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ข้อมูลการติดต่อ ที่ตั้งรีสอร์ท และแผนที่นำทาง Google Maps
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Contact Information */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-resort-700 to-resort-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {resortName}
                </h2>
                <p className="text-xs text-resort-600 font-semibold">
                  {settings?.resort_name_en || 'Resort Room Booking'}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">ที่อยู่</span>
                  <span className="text-slate-600 leading-relaxed">{address}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">เบอร์โทรศัพท์</span>
                  <a
                    href={`tel:${settings?.phone || '0626252564'}`}
                    className="text-resort-700 font-extrabold text-sm hover:underline"
                  >
                    {settings?.phone || '062-625-2564'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">อีเมลติดต่อ</span>
                  <a
                    href={`mailto:${settings?.email || 'sombatoffice@gmail.com'}`}
                    className="text-slate-600 hover:underline"
                  >
                    {settings?.email || 'sombatoffice@gmail.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-resort-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">เวลาเช็คอิน / เช็คเอาท์</span>
                  <span className="text-slate-600">
                    เช็คอินได้ตั้งแต่ {settings?.check_in_time ? settings.check_in_time.slice(0, 5) : '14:00'} น. • เช็คเอาท์ก่อน {settings?.check_out_time ? settings.check_out_time.slice(0, 5) : '12:00'} น.
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-resort-700 hover:bg-resort-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>นำทางด้วย Google Maps</span>
              </a>

              <a
                href={`https://line.me/R/ti/p/${settings?.line_id || '@sombatcom'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>แชทกับเราผ่าน LINE OA ({settings?.line_id || '@sombatcom'})</span>
              </a>
            </div>
          </div>

          {/* Policy Terms */}
          {settings?.policy_terms && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-resort-600" />
                <span>นโยบายและระเบียบการเข้าพัก</span>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {settings.policy_terms}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Google Maps Frame */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-sm flex-1 flex flex-col min-h-[420px] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-resort-50 text-resort-600 rounded-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">แผนที่ตำแหน่งรีสอร์ท</h3>
                  <p className="text-[11px] text-slate-500">Google Maps Live Interactive View</p>
                </div>
              </div>

              <a
                href={googleMapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-resort-700 hover:text-resort-800 flex items-center gap-1 bg-resort-50 hover:bg-resort-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                <span>เปิดแอป Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Embedded Interactive Google Map */}
            <div className="flex-1 w-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative">
              <iframe
                title="Google Maps Location"
                width="100%"
                height="100%"
                className="w-full h-full min-h-[380px] border-0"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={googleMapsEmbedUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
