'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { WalkInModal } from '@/components/admin/WalkInModal';
import {
  BedDouble,
  DoorOpen,
  CalendarCheck,
  CalendarX,
  Coins,
  Receipt,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Users,
  UserCheck,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<{
    kpis?: {
      totalRooms: number;
      availableRooms: number;
      bookedRooms: number;
      maintenanceRooms: number;
      todayCheckIns: number;
      todayCheckOuts: number;
      todayBookings: number;
      todayRevenue: number;
      totalRevenue: number;
      totalPaid: number;
      totalOutstanding: number;
      pendingPaymentsCount: number;
      pendingPaymentsAmount: number;
      totalBookingsCount: number;
    };
    popularRooms?: { roomName: string; count: number; totalRevenue: number }[];
    monthlyRevenue?: { month: string; revenue: number }[];
  } | null>(null);

  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);

  const fetchDashboardData = () => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .catch(() => {});

    fetch('/api/bookings?isAdmin=true')
      .then((r) => r.json())
      .then((d) => d.success && setRecentBookings((d.bookings || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Top Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            แดชบอร์ดภาพรวมรีสอร์ท (Resort Dashboard)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            สถิติสถานะห้องพัก รายได้ และรายการจองประจำวัน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsWalkInModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition-all"
          >
            <UserCheck className="w-4 h-4" />
            <span>+ รับลูกค้า Walk-in</span>
          </button>
          <Link
            href="/admin/calendar"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-resort-600" />
            <span>ดูปฏิทินห้องพัก</span>
          </Link>
          <Link
            href="/admin/payments"
            className="px-3.5 py-2 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>ตรวจสอบสลิป ({kpis?.pendingPaymentsCount || 0})</span>
          </Link>
        </div>
      </div>

      {/* KPI Grid (Requirement #20) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Rooms & Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">ห้องพักทั้งหมด</span>
            <BedDouble className="w-4 h-4 text-resort-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {kpis?.totalRooms || 0} <span className="text-xs font-normal text-slate-500">ห้อง</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
            <span className="text-green-600 font-bold">ว่าง: {kpis?.availableRooms || 0}</span>
            <span className="text-amber-600 font-bold">จองแล้ว: {kpis?.bookedRooms || 0}</span>
          </div>
        </div>

        {/* Today's Check-ins & Check-outs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Check-in วันนี้</span>
            <DoorOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">
            {kpis?.todayCheckIns || 0} <span className="text-xs font-normal text-slate-500">รายการ</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>Check-out วันนี้:</span>
            <span className="font-bold text-slate-800">{kpis?.todayCheckOuts || 0} รายการ</span>
          </div>
        </div>

        {/* Total Revenue & Paid */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">รายได้รวมสุทธิ</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(kpis?.totalRevenue || 0)}
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>ชำระแล้ว:</span>
            <span className="font-bold text-green-600">{formatCurrency(kpis?.totalPaid || 0)}</span>
          </div>
        </div>

        {/* Outstanding & Pending Slips */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">ยอดค้างชำระ</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">
            {formatCurrency(kpis?.totalOutstanding || 0)}
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>สลิปรอตรวจ:</span>
            <span className="font-bold text-amber-600">{kpis?.pendingPaymentsCount || 0} รายการ</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Bookings & Popular Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Bookings Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-resort-600" />
              <span>รายการจองล่าสุด (Recent Bookings)</span>
            </h2>
            <Link
              href="/admin/bookings"
              className="text-xs font-bold text-resort-700 hover:text-resort-800 flex items-center gap-1"
            >
              <span>ดูทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              ยังไม่มีข้อมูลการจองในระบบ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-2.5">รหัสการจอง</th>
                    <th className="p-2.5">ลูกค้า</th>
                    <th className="p-2.5">ห้องพัก</th>
                    <th className="p-2.5">ยอดสุทธิ</th>
                    <th className="p-2.5">สถานะ</th>
                    <th className="p-2.5 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800">{b.booking_number}</td>
                      <td className="p-2.5 font-medium text-slate-700">{b.customer?.full_name || '-'}</td>
                      <td className="p-2.5 text-slate-600">
                        {b.booking_items?.[0]?.room_name || '-'} (ห้อง {b.booking_items?.[0]?.room_number})
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{formatCurrency(b.net_total)}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-700'
                              : b.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px]"
                        >
                          จัดการ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Popular Rooms & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <TrendingUp className="w-4 h-4 text-resort-600" />
              <span>ห้องพักยอดนิยม (Popular Rooms)</span>
            </h2>

            {(!data?.popularRooms || data.popularRooms.length === 0) ? (
              <div className="text-center py-6 text-xs text-slate-400">
                ยังไม่มีข้อมูลสถิติ
              </div>
            ) : (
              <div className="space-y-3">
                {data.popularRooms.map((room, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{room.roomName}</div>
                      <div className="text-slate-400 text-[11px]">จองแล้ว {room.count} ครั้ง</div>
                    </div>
                    <div className="font-extrabold text-resort-700">
                      {formatCurrency(room.totalRevenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Admin Actions */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              ทางลัดการทำงาน
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/rooms"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-center transition-colors"
              >
                + เพิ่มห้องพัก
              </Link>
              <Link
                href="/admin/promotions"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-center transition-colors"
              >
                + สร้างโปรโมชั่น
              </Link>
              <Link
                href="/admin/reports"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-center transition-colors"
              >
                ดาวน์โหลด Excel
              </Link>
              <Link
                href="/admin/settings"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-center transition-colors"
              >
                ตั้งค่ารีสอร์ท
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Walk-in Modal */}
      <WalkInModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
}
