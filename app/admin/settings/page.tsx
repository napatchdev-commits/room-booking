'use client';

import React, { useState, useEffect } from 'react';
import { Settings, BankAccount } from '@/types/database';
import {
  Settings as SettingsIcon,
  Save,
  Building2,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ExternalLink,
  Navigation,
  Bell,
  Send,
  Loader2,
  Wrench,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [resortName, setResortName] = useState('');
  const [resortNameEn, setResortNameEn] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineId, setLineId] = useState('');
  const [lineLiffId, setLineLiffId] = useState('');
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState('');
  const [lineAdminUserId, setLineAdminUserId] = useState('');
  const [lineNotifyToken, setLineNotifyToken] = useState('');
  const [taxId, setTaxId] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [policyTerms, setPolicyTerms] = useState('');

  // Maintenance Mode States
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceUntil, setMaintenanceUntil] = useState('');

  // Bank Account
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [promptpayId, setPromptpayId] = useState('');

  // LINE Test State
  const [isTestingLine, setIsTestingLine] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setSettings(s);
        setResortName(s.resort_name || '');
        setResortNameEn(s.resort_name_en || '');
        setAddress(s.address || '');
        setPhone(s.phone || '');
        setEmail(s.email || '');
        setLineId(s.line_id || '');
        setLineLiffId(s.line_liff_id || '');
        setLineChannelAccessToken(s.line_channel_access_token || '');
        setLineAdminUserId(s.line_admin_user_id || '');
        setLineNotifyToken(s.line_notify_token || '');
        setTaxId(s.tax_id || '');

        const formatTimeForInput = (t?: string) => {
          if (!t) return '14:00';
          const parts = t.split(':');
          if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
          return t;
        };

        setCheckInTime(formatTimeForInput(s.check_in_time) || '14:00');
        setCheckOutTime(formatTimeForInput(s.check_out_time) || '12:00');
        setPolicyTerms(s.policy_terms || '');
        setIsMaintenanceMode(s.is_maintenance_mode ?? false);
        setMaintenanceMessage(s.maintenance_message || '');
        setMaintenanceUntil(s.maintenance_until || '');

        if (s.bank_accounts && Array.isArray(s.bank_accounts) && s.bank_accounts.length > 0) {
          const b = s.bank_accounts[0];
          setBankName(b.bank_name || '');
          setAccountNumber(b.account_number || '');
          setAccountName(b.account_name || '');
          setPromptpayId(b.promptpay_id || '');
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    const bankAccounts: BankAccount[] = [
      {
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        promptpay_id: promptpayId.trim(),
      },
    ];

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resort_name: resortName.trim(),
          resort_name_en: resortNameEn.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          line_id: lineId.trim(),
          line_liff_id: lineLiffId.trim(),
          line_channel_access_token: lineChannelAccessToken.trim(),
          line_admin_user_id: lineAdminUserId.trim(),
          line_notify_token: lineNotifyToken.trim(),
          tax_id: taxId.trim(),
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          policy_terms: policyTerms.trim(),
          is_maintenance_mode: isMaintenanceMode,
          maintenance_message: maintenanceMessage.trim(),
          maintenance_until: maintenanceUntil.trim(),
          bank_accounts: bankAccounts,
          actorName: 'Admin',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        if (data.settings) {
          setSettings(data.settings);
        }
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMsg(data.error || 'ไม่สามารถบันทึกการตั้งค่าได้');
      }
    } catch (err) {
      console.error('Settings save error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLineNotification = async () => {
    setIsTestingLine(true);
    setLineTestResult(null);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelAccessToken: lineChannelAccessToken.trim(),
          adminUserId: lineAdminUserId.trim(),
          notifyToken: lineNotifyToken.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLineTestResult({ success: true, message: data.message || 'ส่งแจ้งเตือนสำเร็จ!' });
      } else {
        setLineTestResult({ success: false, message: data.error || 'ส่งแจ้งเตือนไม่สำเร็จ' });
      }
    } catch (err) {
      setLineTestResult({ success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setIsTestingLine(false);
    }
  };

  // Google Maps helper URLs
  const currentMapQuery = encodeURIComponent(`${resortName || 'สมบัติ รีสอร์ท'} ${address || 'ไทรน้อย นนทบุรี'}`);
  const previewMapEmbedUrl = `https://maps.google.com/maps?q=${currentMapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const previewMapDirectUrl = `https://www.google.com/maps/search/?api=1&query=${currentMapQuery}`;
  const previewMapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentMapQuery}`;

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">กำลังโหลดการตั้งค่า...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-resort-600" />
            <span>ตั้งค่าระบบรีสอร์ท & LINE แจ้งเตือน</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            กำหนดชื่อรีสอร์ท แผนที่ บัญชีธนาคาร และการแจ้งเตือนบอท LINE ไปยังแอดมิน
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">บันทึกการตั้งค่าเรียบร้อยแล้ว ข้อมูลจะอัพเดทไปยังระบบทันที</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Maintenance Mode Settings (โหมดปิดปรับปรุงระบบ / ซ่อมบำรุง) */}
        <div className={`rounded-3xl border p-5 sm:p-6 shadow-sm space-y-4 transition-all ${
          isMaintenanceMode
            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold transition-colors ${
                isMaintenanceMode ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'
              }`}>
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>โหมดปิดปรับปรุงระบบ / ซ่อมบำรุง (Maintenance Mode)</span>
                  {isMaintenanceMode ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold animate-pulse">
                      🔴 กำลังปิดปรับปรุง
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      🟢 เปิดให้บริการปกติ
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  เมื่อเปิดใช้งาน ระบบจะปิดรับการจองออนไลน์ และแสดงหน้าแจ้งปิดปรับปรุงให้ลูกค้าทราบ โดยที่แอดมินยังคงเข้าใช้งานจัดการระบบได้ตามปกติ
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={isMaintenanceMode}
                onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-700">
                {isMaintenanceMode ? 'เปิดโหมดปิดปรับปรุง' : 'ปิด (ทำงานปกติ)'}
              </span>
            </label>
          </div>

          {isMaintenanceMode && (
            <div className="space-y-3.5 pt-1 text-xs animate-in fade-in">
              <div>
                <label className="block font-bold text-amber-900 mb-1">
                  ข้อความชี้แจงลูกค้า (Maintenance Announcement Message)
                </label>
                <textarea
                  rows={2}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="ขณะนี้ทางรีสอร์ทกำลังดำเนินการปิดปรับปรุงระบบและซ่อมบำรุงห้องพักชั่วคราว เพื่อยกระดับความสะดวกสบายสำหรับคุณ ขออภัยในความไม่สะดวก"
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-medium text-slate-800 outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-900 mb-1">
                  กำหนดเวลาเปิดให้บริการตามปกติ (Estimated Reopening Date/Time)
                </label>
                <input
                  type="text"
                  value={maintenanceUntil}
                  onChange={(e) => setMaintenanceUntil(e.target.value)}
                  placeholder="เช่น วันที่ 5 กันยายน 2569 เวลา 08:00 น."
                  className="w-full sm:w-1/2 px-3 py-2 bg-white border border-amber-200 rounded-xl font-medium text-slate-800 outline-none focus:border-amber-500 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Resort Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-resort-600" />
            <span>ข้อมูลทั่วไปของรีสอร์ท</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อรีสอร์ท (ภาษาไทย) *</label>
              <input
                type="text"
                required
                value={resortName}
                onChange={(e) => setResortName(e.target.value)}
                placeholder="เช่น สมบัติ รีสอร์ท"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อรีสอร์ท (English) *</label>
              <input
                type="text"
                required
                value={resortNameEn}
                onChange={(e) => setResortNameEn(e.target.value)}
                placeholder="เช่น Sombat Resort"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">ที่อยู่รีสอร์ท * (สำหรับแสดงผลและปักหมุดบน Google Maps)</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ที่อยู่และตำแหน่งของรีสอร์ท"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์รีสอร์ท *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="062-xxx-xxxx"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">อีเมลติดต่อ</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sombatoffice@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">LINE Official Account ID</label>
              <input
                type="text"
                placeholder="@sombatcom"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">LINE LIFF ID</label>
              <input
                type="text"
                placeholder="1234567890-AbCdEfGh"
                value={lineLiffId}
                onChange={(e) => setLineLiffId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
              <input
                type="text"
                placeholder="0125569001220"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* LINE Bot Notifications to Admin */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-resort-600" />
              <span>การแจ้งเตือน LINE ไปยังแอดมิน (เมื่อมีจอง / แนบสลิป)</span>
            </h2>
            <button
              type="button"
              onClick={handleTestLineNotification}
              disabled={isTestingLine}
              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isTestingLine ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>ทดสอบส่งแจ้งเตือน LINE</span>
            </button>
          </div>

          {lineTestResult && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                lineTestResult.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {lineTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{lineTestResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                LINE Channel Access Token (จาก LINE Messaging API)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={lineChannelAccessToken}
                onChange={(e) => setLineChannelAccessToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                ได้จากแท็บ Messaging API ใน LINE Developers Console
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                LINE Admin User ID (สำหรับรับข้อความแจ้งเตือน)
              </label>
              <input
                type="text"
                placeholder="U1234567890abcdef..."
                value={lineAdminUserId}
                onChange={(e) => setLineAdminUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                ดูได้ที่แท็บ Basic Settings ใน LINE Developers Console
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                LINE Notify Token (ตัวเลือกเสริม)
              </label>
              <input
                type="text"
                placeholder="โทเคน LINE Notify (ถ้ามี)"
                value={lineNotifyToken}
                onChange={(e) => setLineNotifyToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                สำหรับแจ้งเตือนเข้ากลุ่ม LINE พนักงาน
              </p>
            </div>
          </div>
        </div>

        {/* Live Google Maps Preview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-resort-600" />
              <span>แผนที่ตำแหน่งรีสอร์ท (Google Maps Preview)</span>
            </h2>
            <div className="flex items-center gap-2">
              <a
                href={previewMapDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-resort-50 hover:bg-resort-100 text-resort-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>ทดสอบนำทาง</span>
              </a>
              <a
                href={previewMapDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <span>เปิดใน Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
            <iframe
              title="Google Maps Admin Preview"
              width="100%"
              height="100%"
              className="w-full h-full border-0"
              loading="lazy"
              src={previewMapEmbedUrl}
            />
          </div>
        </div>

        {/* Bank Account Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-resort-600" />
            <span>บัญชีธนาคารสำหรับรับโอนเงิน</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อธนาคาร</label>
              <input
                type="text"
                placeholder="เช่น ธนาคารกสิกรไทย, ธนาคารไทยพาณิชย์"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เลขที่บัญชี</label>
              <input
                type="text"
                placeholder="เช่น 123-4-56789-0"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อบัญชี</label>
              <input
                type="text"
                placeholder="ชื่อบัญชีรับโอน"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เบอร์พร้อมเพย์ (PromptPay ID)</label>
              <input
                type="text"
                placeholder="เบอร์โทรหรือเลขประจำตัวประชาชน"
                value={promptpayId}
                onChange={(e) => setPromptpayId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Check-in / Out Time & Policy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-resort-600" />
            <span>เวลาเช็คอิน-เช็คเอาท์ และนโยบายรีสอร์ท</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">เวลาเช็คอินเริ่มต้น</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เวลาเช็คเอาท์สิ้นสุด</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">นโยบายและระเบียบการเข้าพัก (แสดงบนใบจอง)</label>
              <textarea
                rows={3}
                placeholder="เช่น เวลาเช็คอิน 14:00 น. เช็คเอาท์ 12:00 น. ห้ามสูบบุหรี่ภายในห้องพัก..."
                value={policyTerms}
                onChange={(e) => setPolicyTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
