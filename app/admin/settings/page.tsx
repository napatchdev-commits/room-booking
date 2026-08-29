'use client';

import React, { useState, useEffect } from 'react';
import { Settings, BankAccount } from '@/types/database';
import { Settings as SettingsIcon, Save, Building2, CreditCard, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [taxId, setTaxId] = useState('');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [policyTerms, setPolicyTerms] = useState('');

  // Bank Account
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [promptpayId, setPromptpayId] = useState('');

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
        setTaxId(s.tax_id || '');

        // Format time properly for <input type="time"> (HH:mm)
        const formatTimeForInput = (t?: string) => {
          if (!t) return '14:00';
          const parts = t.split(':');
          if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
          return t;
        };

        setCheckInTime(formatTimeForInput(s.check_in_time) || '14:00');
        setCheckOutTime(formatTimeForInput(s.check_out_time) || '12:00');
        setPolicyTerms(s.policy_terms || '');

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
          tax_id: taxId.trim(),
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          policy_terms: policyTerms.trim(),
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
            <span>ตั้งค่าระบบรีสอร์ท (Resort Settings)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            กำหนดชื่อรีสอร์ท ที่อยู่ เบอร์โทร บัญชีธนาคารรับเงิน และ LINE LIFF
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">บันทึกการตั้งค่าเรียบร้อยแล้ว ข้อมูลจะอัพเดทไปยังหน้าลูกค้าทันที</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
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
              <label className="block font-bold text-slate-700 mb-1">ที่อยู่รีสอร์ท *</label>
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
