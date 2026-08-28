'use client';

import React, { useState, useEffect } from 'react';
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
  History,
  Settings as SettingsIcon,
  Shield,
  ArrowLeft,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navItems = [
    { href: '/admin/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { href: '/admin/calendar', label: 'ปฏิทินห้องพัก', icon: CalendarDays },
    { href: '/admin/rooms', label: 'จัดการห้องพัก', icon: BedDouble },
    { href: '/admin/bookings', label: 'รายการจอง', icon: BookOpenCheck },
    { href: '/admin/payments', label: 'ตรวจสอบชำระเงิน', icon: CreditCard },
    { href: '/admin/receipts', label: 'ใบเสร็จรับเงิน', icon: Receipt },
    { href: '/admin/promotions', label: 'โปรโมชั่น', icon: Sparkles },
    { href: '/admin/reports', label: 'รายงานและสถิติ', icon: BarChart3 },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: History },
    { href: '/admin/settings', label: 'ตั้งค่ารีสอร์ท', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white flex-col flex-shrink-0 min-h-screen">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-resort-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
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
        {/* Top bar with Role Switcher */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-xs font-bold text-slate-700 hidden sm:block">
              ระบบจัดการรีสอร์ท (Back-office Management)
            </div>
          </div>

          {/* Role Switcher Widget for Testing RBAC & Live Permission */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-resort-600" />
              <span>บทบาทสิทธิ์ (Role):</span>
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
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                          isActive ? 'bg-resort-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
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
