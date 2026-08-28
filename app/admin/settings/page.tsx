'use client';

import React, { useState, useEffect } from 'react';
import { Settings, BankAccount } from '@/types/database';
import { Settings as SettingsIcon, Save, Building2, CreditCard, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย (KBank)');
  const [accountNumber, setAccountNumber] = useState('123-4-56789-0');
  const [accountName, setAccountName] = useState('Paradise Resort Co., Ltd.');
  const [promptpayId, setPromptpayId] = useState('0899999999');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings) {
          const s = d.settings;
          setSettings(s);
          setResortName(s.resort_name || '');
          setResortNameEn(s.resort_name_en || '');
          setAddress(s.address || '');
          setPhone(s.phone || '');
          setEmail(s.email || '');
          setLineId(s.line_id || '');
          setLineLiffId(s.line_liff_id || '');
          setTaxId(s.tax_id || '');
          setCheckInTime(s.check_in_time || '14:00');
          setCheckOutTime(s.check_out_time || '12:00');
          setPolicyTerms(s.policy_terms || '');

          if (s.bank_accounts && s.bank_accounts.length > 0) {
            const b = s.bank_accounts[0];
            setBankName(b.bank_name || '');
            setAccountNumber(b.account_number || '');
            setAccountName(b.account_name || '');
            setPromptpayId(b.promptpay_id || '');
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const bankAccounts: BankAccount[] = [
      {
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        promptpay_id: promptpayId,
      },
    ];

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resort_name: resortName,
          resort_name_en: resortNameEn,
          address,
          phone,
          email,
          line_id: lineId,
          line_liff_id: lineLiffId,
          tax_id: taxId,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          policy_terms: policyTerms,
          bank_accounts: bankAccounts,
          actorName: 'Admin',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Settings save error:', err);
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
            กำหนดชื่อรีสอร์ท โลโก้ บัญชีธนาคารสำหรับรับชำระเงิน และการเชื่อมต่อ LINE LIFF
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อรีสอร์ท (English) *</label>
              <input
                type="text"
                required
                value={resortNameEn}
                onChange={(e) => setResortNameEn(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">ที่อยู่รีสอร์ท *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์รีสอร์ท *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">อีเมลติดต่อ</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">LINE Official Account ID</label>
              <input
                type="text"
                placeholder="@resort"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">LINE LIFF ID</label>
              <input
                type="text"
                placeholder="1234567890-AbCdEfGh"
                value={lineLiffId}
                onChange={(e) => setLineLiffId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
              <input
                type="text"
                placeholder="0105550000000"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
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
              <label className="block font-bold text-slate-700 mb-1">ชื่อธนาคาร *</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เลขที่บัญชี *</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อบัญชี *</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เบอร์พร้อมเพย์ (PromptPay ID)</label>
              <input
                type="text"
                value={promptpayId}
                onChange={(e) => setPromptpayId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เวลาเช็คเอาท์สิ้นสุด</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">นโยบายและระเบียบการเข้าพัก (แสดงบนใบจอง)</label>
              <textarea
                rows={3}
                value={policyTerms}
                onChange={(e) => setPolicyTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
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
