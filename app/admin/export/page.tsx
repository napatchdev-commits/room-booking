'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Payment, Receipt, Room } from '@/types/database';
import { formatCurrency, formatDateTime, formatDateShort, formatDateThaiLong } from '@/lib/formatters';
import {
  exportMonthlyCompleteReport,
  exportBookingsToExcel,
  exportPaymentsToExcel,
  exportReceiptsToExcel,
  exportFinancialReportToExcel,
} from '@/lib/excel-export';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  BookOpenCheck,
  CreditCard,
  Receipt as ReceiptIcon,
  Search,
  CheckCircle2,
  TrendingUp,
  Building,
  Layers,
  FileText,
} from 'lucide-react';

const THAI_MONTHS = [
  { value: 1, name: 'มกราคม' },
  { value: 2, name: 'กุมภาพันธ์' },
  { value: 3, name: 'มีนาคม' },
  { value: 4, name: 'เมษายน' },
  { value: 5, name: 'พฤษภาคม' },
  { value: 6, name: 'มิถุนายน' },
  { value: 7, name: 'กรกฎาคม' },
  { value: 8, name: 'สิงหาคม' },
  { value: 9, name: 'กันยายน' },
  { value: 10, name: 'ตุลาคม' },
  { value: 11, name: 'พฤศจิกายน' },
  { value: 12, name: 'ธันวาคม' },
];

export default function AdminExportPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentDate.getMonth() + 1);

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [allReceipts, setAllReceipts] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'PAYMENTS' | 'RECEIPTS'>('BOOKINGS');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all datasets
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const [bRes, pRes, rRes, rmRes] = await Promise.all([
          fetch('/api/bookings?isAdmin=true', { cache: 'no-store' }),
          fetch('/api/payments', { cache: 'no-store' }),
          fetch('/api/receipts', { cache: 'no-store' }),
          fetch('/api/rooms', { cache: 'no-store' }),
        ]);

        const bData = await bRes.json();
        const pData = await pRes.json();
        const rData = await rRes.json();
        const rmData = await rmRes.json();

        if (bData.success) setAllBookings(bData.bookings || []);
        if (pData.success) setAllPayments(pData.payments || []);
        if (rData.success) setAllReceipts(rData.receipts || []);
        if (rmData.success) setAllRooms(rmData.rooms || []);
      } catch (err) {
        console.error('Failed to load export data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Filter records by selected Month and Year
  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      const date = new Date(b.created_at || b.check_in_date);
      const matchYear = date.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === 'ALL' || date.getMonth() + 1 === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [allBookings, selectedYear, selectedMonth]);

  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      const date = new Date(p.created_at);
      const matchYear = date.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === 'ALL' || date.getMonth() + 1 === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [allPayments, selectedYear, selectedMonth]);

  const filteredReceipts = useMemo(() => {
    return allReceipts.filter((r) => {
      const date = new Date(r.issued_at || r.created_at);
      const matchYear = date.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === 'ALL' || date.getMonth() + 1 === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [allReceipts, selectedYear, selectedMonth]);

  // Monthly summary metrics
  const monthlySummary = useMemo(() => {
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (Number(b.net_total) || 0), 0);
    const totalPaid = filteredPayments
      .filter((p) => p.status === 'VERIFIED')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalOutstanding = filteredBookings.reduce((sum, b) => sum + (Number(b.remaining_balance) || 0), 0);
    const totalPromoDiscounts = filteredBookings.reduce((sum, b) => sum + (Number(b.promotion_discount) || 0), 0);
    const totalManualDiscounts = filteredBookings.reduce((sum, b) => sum + (Number(b.manual_discount) || 0), 0);
    const totalNights = filteredBookings.reduce((sum, b) => sum + (Number(b.total_nights) || 1), 0);

    return {
      totalRevenue,
      totalPaid,
      totalOutstanding,
      totalPromoDiscounts,
      totalManualDiscounts,
      totalBookings: filteredBookings.length,
      totalNights,
      totalReceiptsCount: filteredReceipts.length,
    };
  }, [filteredBookings, filteredPayments, filteredReceipts]);

  // Get month display name
  const currentMonthName = selectedMonth === 'ALL' ? 'ตลอดทั้งปี' : THAI_MONTHS.find((m) => m.value === selectedMonth)?.name;

  // Handle Complete Monthly Export
  const handleExportAllInOne = () => {
    exportMonthlyCompleteReport({
      year: selectedYear,
      month: selectedMonth === 'ALL' ? undefined : selectedMonth,
      monthName: currentMonthName,
      bookings: filteredBookings,
      payments: filteredPayments,
      receipts: filteredReceipts,
      rooms: allRooms,
      summary: monthlySummary,
    });
  };

  const handleExportBookingsOnly = () => {
    exportBookingsToExcel(
      filteredBookings,
      `Bookings_${selectedYear}_${selectedMonth === 'ALL' ? 'ALL' : String(selectedMonth).padStart(2, '0')}.xlsx`
    );
  };

  const handleExportPaymentsOnly = () => {
    exportPaymentsToExcel(
      filteredPayments,
      `Payments_${selectedYear}_${selectedMonth === 'ALL' ? 'ALL' : String(selectedMonth).padStart(2, '0')}.xlsx`
    );
  };

  const handleExportReceiptsOnly = () => {
    exportReceiptsToExcel(
      filteredReceipts,
      `Receipts_${selectedYear}_${selectedMonth === 'ALL' ? 'ALL' : String(selectedMonth).padStart(2, '0')}.xlsx`
    );
  };

  const handleExportFinancialSummaryOnly = () => {
    exportFinancialReportToExcel(
      {
        totalRevenue: monthlySummary.totalRevenue,
        totalPaid: monthlySummary.totalPaid,
        totalOutstanding: monthlySummary.totalOutstanding,
        totalPromoDiscounts: monthlySummary.totalPromoDiscounts,
        totalManualDiscounts: monthlySummary.totalManualDiscounts,
        totalBookings: monthlySummary.totalBookings,
      },
      filteredPayments,
      `Financial_Summary_${selectedYear}_${selectedMonth === 'ALL' ? 'ALL' : String(selectedMonth).padStart(2, '0')}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
            <span>ศูนย์ส่งออกข้อมูลประจำเดือน (Monthly Data Export)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            เลือกเดือนและปีที่ต้องการเพื่อดาวน์โหลดรายงานครบวงจร (การจอง, การชำระเงิน, ใบเสร็จรับเงิน, สถิติห้องพัก)
          </p>
        </div>
      </div>

      {/* Month & Year Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">ปี:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-resort-500"
            >
              {[2027, 2026, 2025, 2024, 2023].map((yr) => (
                <option key={yr} value={yr}>
                  {yr + 543} ({yr})
                </option>
              ))}
            </select>
          </div>

          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">เดือน:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none focus:border-resort-500"
            >
              <option value="ALL">🗓️ ตลอดทั้งปี (All Months)</option>
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>ช่วงเวลา: {currentMonthName} {selectedYear + 543}</span>
          </span>
        </div>

        {/* Master Export Button */}
        <div>
          <button
            onClick={handleExportAllInOne}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-700/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📦 ดาวน์โหลดรายงานรวมทุกอย่าง (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Net Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รายได้รวมสุทธิ</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(monthlySummary.totalRevenue)}
          </div>
          <p className="text-[10px] text-slate-400">จากยอดการจองสุทธิในเดือน</p>
        </div>

        {/* Metric 2: Paid Amount */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ยอดเงินที่รับชำระแล้ว</span>
            <CreditCard className="w-4 h-4 text-resort-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-resort-700">
            {formatCurrency(monthlySummary.totalPaid)}
          </div>
          <p className="text-[10px] text-slate-400">ผ่านการตรวจสอบสลิปแล้ว</p>
        </div>

        {/* Metric 3: Total Bookings */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">จำนวนการจอง</span>
            <BookOpenCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {monthlySummary.totalBookings} <span className="text-xs font-medium text-slate-500">รายการ</span>
          </div>
          <p className="text-[10px] text-slate-400">รวม {monthlySummary.totalNights} คืนพัก</p>
        </div>

        {/* Metric 4: Total Receipts */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ใบเสร็จรับเงินที่ออก</span>
            <ReceiptIcon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {monthlySummary.totalReceiptsCount} <span className="text-xs font-medium text-slate-500">ใบ</span>
          </div>
          <p className="text-[10px] text-slate-400">ออกอย่างเป็นทางการ</p>
        </div>
      </div>

      {/* Quick Individual Export Buttons */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-resort-600" />
          <span>ดาวน์โหลดแยกไฟล์เฉพาะประเภท:</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={handleExportBookingsOnly}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <BookOpenCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Export รายการจอง ({filteredBookings.length})</span>
          </button>

          <button
            onClick={handleExportPaymentsOnly}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5 text-resort-600" />
            <span>Export การชำระเงิน ({filteredPayments.length})</span>
          </button>

          <button
            onClick={handleExportReceiptsOnly}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <ReceiptIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>Export ใบเสร็จ ({filteredReceipts.length})</span>
          </button>

          <button
            onClick={handleExportFinancialSummaryOnly}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export สรุปรายได้ & สถิติ</span>
          </button>
        </div>
      </div>

      {/* Interactive Data Preview Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('BOOKINGS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'BOOKINGS'
                  ? 'bg-resort-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>รายการจอง ({filteredBookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PAYMENTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'PAYMENTS'
                  ? 'bg-resort-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>การชำระเงิน ({filteredPayments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('RECEIPTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'RECEIPTS'
                  ? 'bg-resort-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ReceiptIcon className="w-3.5 h-3.5" />
              <span>ใบเสร็จรับเงิน ({filteredReceipts.length})</span>
            </button>
          </div>

          {/* Search Box inside month */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาในเดือนนี้..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-resort-500 w-full sm:w-48"
            />
          </div>
        </div>

        {/* Tab Content Tables */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : activeTab === 'BOOKINGS' ? (
          <div className="overflow-x-auto">
            {filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">ไม่มีรายการจองในเดือนนี้</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">เลขที่การจอง</th>
                    <th className="p-2.5">ลูกค้า</th>
                    <th className="p-2.5">ห้องพัก</th>
                    <th className="p-2.5">เช็คอิน - เอาท์</th>
                    <th className="p-2.5 text-right">ยอดสุทธิ</th>
                    <th className="p-2.5 text-right">ชำระแล้ว</th>
                    <th className="p-2.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings
                    .filter(
                      (b) =>
                        !searchQuery ||
                        b.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-resort-700">{b.booking_number}</td>
                        <td className="p-2.5 font-medium text-slate-800">{b.customer?.full_name || '-'}</td>
                        <td className="p-2.5 text-slate-600">
                          {(b.booking_items || []).map((it) => it.room_name).join(', ') || '-'}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {formatDateShort(b.check_in_date)} - {formatDateShort(b.check_out_date)}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-slate-900">
                          {formatCurrency(b.net_total)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          {formatCurrency(b.paid_amount)}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeTab === 'PAYMENTS' ? (
          <div className="overflow-x-auto">
            {filteredPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">ไม่มีรายการชำระเงินในเดือนนี้</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">เลขที่การจอง</th>
                    <th className="p-2.5">ลูกค้า</th>
                    <th className="p-2.5 text-right">จำนวนเงิน</th>
                    <th className="p-2.5">ช่องทาง</th>
                    <th className="p-2.5">วันที่ชำระ</th>
                    <th className="p-2.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments
                    .filter(
                      (p: any) =>
                        !searchQuery ||
                        (p.booking?.booking_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.booking?.customer?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-resort-700">{p.booking?.booking_number || p.booking_id}</td>
                        <td className="p-2.5 font-medium text-slate-800">{p.booking?.customer?.full_name || '-'}</td>
                        <td className="p-2.5 text-right font-extrabold text-slate-900">{formatCurrency(p.amount)}</td>
                        <td className="p-2.5 text-slate-600">{p.payment_method}</td>
                        <td className="p-2.5 text-slate-500">{formatDateTime(p.created_at)}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'VERIFIED'
                                ? 'bg-green-100 text-green-700'
                                : p.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filteredReceipts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">ไม่มีใบเสร็จรับเงินในเดือนนี้</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">เลขที่ใบเสร็จ</th>
                    <th className="p-2.5">เลขที่การจอง</th>
                    <th className="p-2.5">ชื่อลูกค้า</th>
                    <th className="p-2.5 text-right">จำนวนเงิน</th>
                    <th className="p-2.5">วันที่ออก</th>
                    <th className="p-2.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts
                    .filter(
                      (r) =>
                        !searchQuery ||
                        r.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (r.customDetails?.customer_name || r.booking?.customer?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-black text-resort-700">{r.receipt_number}</td>
                        <td className="p-2.5 font-medium text-slate-700">{r.booking?.booking_number || 'Manual'}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {r.customDetails?.customer_name || r.booking?.customer?.full_name || '-'}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900">{formatCurrency(r.amount)}</td>
                        <td className="p-2.5 text-slate-500">{formatDateShort(r.issued_at)}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'ISSUED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
