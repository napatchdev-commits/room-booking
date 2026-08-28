'use client';

import React, { useState, useEffect } from 'react';
import { Booking, Payment } from '@/types/database';
import { formatCurrency } from '@/lib/formatters';
import { exportBookingsToExcel, exportFinancialReportToExcel } from '@/lib/excel-export';
import { BarChart3, Download, FileSpreadsheet, TrendingUp, DollarSign, Calendar, BedDouble } from 'lucide-react';

export default function AdminReportsPage() {
  const [data, setData] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const [repRes, bRes, pRes] = await Promise.all([
          fetch('/api/reports'),
          fetch('/api/bookings'),
          fetch('/api/payments'),
        ]);

        const repData = await repRes.json();
        const bData = await bRes.json();
        const pData = await pRes.json();

        if (repData.success) setData(repData);
        if (bData.success) setBookings(bData.bookings || []);
        if (pData.success) setPayments(pData.payments || []);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleExportBookings = () => {
    exportBookingsToExcel(bookings, `Bookings_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportFinancial = () => {
    if (!data?.kpis) return;
    exportFinancialReportToExcel(
      {
        totalRevenue: data.kpis.totalRevenue,
        totalPaid: data.kpis.totalPaid,
        totalOutstanding: data.kpis.totalOutstanding,
        totalPromoDiscounts: data.kpis.totalPromoDiscounts,
        totalManualDiscounts: data.kpis.totalManualDiscounts,
        totalBookings: data.kpis.totalBookingsCount,
      },
      payments,
      `Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Title & Excel Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-resort-600" />
            <span>รายงานและสถิติ (Financial & Analytics Reports)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            สรุปรายได้ ยอดจอง ส่วนลด และส่งออกข้อมูลเป็นไฟล์ Excel (.xlsx)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportBookings}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Bookings (.xlsx)</span>
          </button>
          <button
            onClick={handleExportFinancial}
            className="px-3.5 py-2 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export รายงานการเงิน (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">รายได้รวมสุทธิ (Net Revenue)</div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(kpis?.totalRevenue)}</div>
          <div className="text-[11px] text-slate-400">จากทั้งหมด {kpis?.totalBookingsCount || 0} รายการจอง</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">ยอดเงินที่ได้รับชำระแล้ว</div>
          <div className="text-2xl font-extrabold text-green-700">{formatCurrency(kpis?.totalPaid)}</div>
          <div className="text-[11px] text-green-600 font-semibold">ยืนยันสลิปเรียบร้อย</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">ยอดค้างชำระ (Outstanding)</div>
          <div className="text-2xl font-extrabold text-red-600">{formatCurrency(kpis?.totalOutstanding)}</div>
          <div className="text-[11px] text-red-500 font-semibold">รอชำระ / รอเช็คอิน</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500">ส่วนลดทั้งหมดที่มอบให้</div>
          <div className="text-2xl font-extrabold text-amber-600">
            {formatCurrency((kpis?.totalPromoDiscounts || 0) + (kpis?.totalManualDiscounts || 0))}
          </div>
          <div className="text-[11px] text-slate-400">
            โปรโมชั่น: {formatCurrency(kpis?.totalPromoDiscounts)} | พิเศษ: {formatCurrency(kpis?.totalManualDiscounts)}
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <TrendingUp className="w-4 h-4 text-resort-600" />
            <span>รายได้รายเดือน (Monthly Revenue)</span>
          </h2>

          {(!data?.monthlyRevenue || data.monthlyRevenue.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400">ยังไม่มีข้อมูลรายได้รายเดือน</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {data.monthlyRevenue.map((m: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{m.month}</span>
                  <span className="font-extrabold text-resort-700">{formatCurrency(m.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Rooms Ranking */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BedDouble className="w-4 h-4 text-resort-600" />
            <span>ห้องพักที่มีการจองมากที่สุด (Popular Rooms)</span>
          </h2>

          {(!data?.popularRooms || data.popularRooms.length === 0) ? (
            <div className="p-8 text-center text-xs text-slate-400">ยังไม่มีข้อมูลสถิติห้องพัก</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {data.popularRooms.map((r: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{idx + 1}. {r.roomName}</span>
                    <span className="text-slate-400 text-[11px] block">{r.count} ครั้งที่ถูกจอง</span>
                  </div>
                  <span className="font-extrabold text-resort-700">{formatCurrency(r.totalRevenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
