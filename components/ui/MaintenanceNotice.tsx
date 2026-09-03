'use client';

import React from 'react';
import { Settings } from '@/types/database';
import { Wrench, Phone, MessageSquare, Shield, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';

interface MaintenanceNoticeProps {
  settings?: Settings | null;
}

export function MaintenanceNotice({ settings }: MaintenanceNoticeProps) {
  const resortName = settings?.resort_name || 'สมบัติ รีสอร์ท';
  const resortNameEn = settings?.resort_name_en || 'SOMBAT RESORT';
  const customMessage =
    settings?.maintenance_message ||
    'ขณะนี้ทางรีสอร์ทกำลังดำเนินการปิดปรับปรุงระบบและซ่อมบำรุงห้องพักชั่วคราว เพื่อยกระดับความสะดวกสบายและมอบประสบการณ์การพักผ่อนที่ดีที่สุดสำหรับคุณ';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center space-y-6 bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-10 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95">
        {/* Resort Official Logo */}
        <div className="w-20 h-20 bg-white rounded-3xl border border-white/20 p-2 mx-auto shadow-xl flex items-center justify-center">
          <img
            src="/logo-sombat.png"
            alt={resortName}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Maintenance Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold tracking-wide">
          <Wrench className="w-4 h-4 animate-bounce" />
          <span>โหมดปิดปรับปรุงระบบชั่วคราว (System Maintenance)</span>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {resortName}
          </h1>
          <p className="text-xs font-semibold text-resort-300 uppercase tracking-widest">
            {resortNameEn}
          </p>
        </div>

        {/* Message */}
        <div className="bg-white/10 rounded-2xl p-4 sm:p-5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-light">
          {customMessage}
        </div>

        {/* Estimated Time */}
        {settings?.maintenance_until && (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-500/20">
            <Clock className="w-4 h-4" />
            <span>กำหนดเปิดให้บริการตามปกติ: {settings.maintenance_until}</span>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="pt-2 space-y-3 border-t border-white/10">
          <p className="text-xs text-slate-400 font-medium">
            หากต้องการสอบถามข้อมูลด่วน หรือจองห้องพักเร่งด่วน กรุณาติดต่อ:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {settings?.phone && (
              <a
                href={`tel:${settings.phone}`}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>โทร: {settings.phone}</span>
              </a>
            )}

            {settings?.line_id && (
              <a
                href={`https://line.me/R/ti/p/@${settings.line_id.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>LINE: @{settings.line_id.replace('@', '')}</span>
              </a>
            )}
          </div>

          {settings?.address && (
            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
              <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span>{settings.address}</span>
            </div>
          )}
        </div>

        {/* Admin Access Footer */}
        <div className="pt-4 border-t border-white/5">
          <Link
            href="/admin/dashboard"
            className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
          >
            <Shield className="w-3 h-3" />
            <span>เข้าสู่ระบบจัดการสำหรับผู้ดูแลระบบ (Admin Access)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
