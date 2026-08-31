'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types/database';
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  BookOpenCheck,
  CreditCard,
  Receipt,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Shield,
  ArrowLeft,
  Menu,
  X,
  UserCheck,
  Bell,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live Notification Badges
  const [pendingBookingsCount, setPendingBookingsCount] = useState<number>(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);

  // Load / save active admin role
  useEffect(() => {
    const savedRole = localStorage.getItem('resort_admin_role') as UserRole;
    if (savedRole) {
      setCurrentRole(savedRole);
    }
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('resort_admin_role', role);
  };

  // Poll live pending bookings & payments count for notification badges
  const fetchLiveCounts = useCallback(async () => {
    try {
      // 1. Pending Bookings count
      const bRes = await fetch('/api/bookings?status=PENDING&isAdmin=true', { cache: 'no-store' });
      const bData = await bRes.json();
      if (bData.success && Array.isArray(bData.bookings)) {
        setPendingBookingsCount(bData.bookings.length);
      }

      // 2. Pending Payments count
      const pRes = await fetch('/api/payments?status=PENDING', { cache: 'no-store' });
      const pData = await pRes.json();
      if (pData.success && Array.isArray(pData.payments)) {
        setPendingPaymentsCount(pData.payments.length);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchLiveCounts();
    const interval = setInterval(fetchLiveCounts, 12000); // refresh every 12 seconds
    return () => clearInterval(interval);
  }, [fetchLiveCounts]);

  const navItems = [
    { href: '/admin/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { href: '/admin/calendar', label: 'ปฏิทินห้องพัก', icon: CalendarDays },
    { href: '/admin/rooms', label: 'จัดการห้องพัก', icon: BedDouble },
    {
      href: '/admin/bookings',
      label: 'รายการจอง',
      icon: BookOpenCheck,
      badge: pendingBookingsCount > 0 ? pendingBookingsCount : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      href: '/admin/payments',
      label: 'ตรวจสอบชำระเงิน',
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-900 font-black',
    },
    { href: '/admin/receipts', label: 'ใบเสร็จรับเงิน', icon: Receipt },
    { href: '/admin/promotions', label: 'โปรโมชั่น', icon: Sparkles },
    { href: '/admin/reports', label: 'รายงานและสถิติ', icon: BarChart3 },
    { href: '/admin/export', label: 'Export ข้อมูลรายเดือน', icon: FileSpreadsheet },
    { href: '/admin/settings', label: 'ตั้งค่ารีสอร์ท & LINE', icon: SettingsIcon },
  ];

  const totalPending = pendingBookingsCount + pendingPaymentsCount;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white flex-col flex-shrink-0 min-h-screen print:hidden no-print">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-resort-600 flex items-center justify-center font-bold text-white shadow-md">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Admin Portal</div>
              <div className="text-[10px] text-slate-400">Resort Management</div>
            </div>
          </Link>

          {totalPending > 0 && (
            <span className="flex h-2.5 w-2.5 relative" title={`${totalPending} รายการรอดำเนินการ`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-resort-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Back to Customer Web Link */}
        <div className="p-3 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าจองห้องพัก</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with Role Switcher & Live Notifications */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30 print:hidden no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 relative"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              {totalPending > 0 && !sidebarOpen && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            <div className="text-xs font-bold text-slate-700 hidden sm:block">
              ระบบจัดการรีสอร์ท (Back-office Management)
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick alert badge in header */}
            {totalPending > 0 && (
              <Link
                href="/admin/bookings"
                className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors animate-in fade-in"
              >
                <Bell className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                <span>รอดำเนินการ {totalPending} รายการ</span>
              </Link>
            )}

            {/* Role Switcher Widget */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 hidden sm:inline flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-resort-600" />
                <span>บทบาทสิทธิ์:</span>
              </span>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                {(['OWNER', 'ADMIN', 'STAFF'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      currentRole === role
                        ? 'bg-resort-700 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex">
            <div className="w-64 bg-slate-900 text-white p-4 space-y-3 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="font-bold text-sm">Admin Navigation</span>
                  <button onClick={() => setSidebarOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                          isActive ? 'bg-resort-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 p-2 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>กลับหน้าลูกค้า</span>
              </Link>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
