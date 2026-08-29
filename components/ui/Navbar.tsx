'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiff } from '@/components/providers/LiffProvider';
import { Settings } from '@/types/database';
import { Building2, User, Menu, X } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { profile, customer, isLoggedIn, login, logout } = useLiff();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = [
    { href: '/', label: 'จองห้องพัก' },
    { href: '/rooms', label: 'ห้องพักทั้งหมด' },
    { href: '/promotions', label: 'โปรโมชั่นพิเศษ' },
    { href: '/bookings', label: 'การจองของฉัน' },
    { href: '/contact', label: 'ติดต่อเรา' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm print:hidden no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-resort-700 to-resort-500 flex items-center justify-center text-white shadow-md shadow-resort-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                {settings?.resort_name || 'Paradise Resort'}
              </span>
              <span className="text-[11px] text-resort-600 font-medium block">
                {settings?.resort_name_en || 'Resort Room Booking'}
              </span>
            </div>
          </Link>

          {/* Desktop Nav for Customers */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-resort-50 text-resort-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: LINE Profile / Login */}
          <div className="flex items-center space-x-2">
            {profile ? (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-full py-1 px-2.5">
                {profile.pictureUrl ? (
                  <img
                    src={profile.pictureUrl}
                    alt={profile.displayName}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-resort-500/30"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-resort-100 text-resort-700 flex items-center justify-center font-bold text-xs">
                    {profile.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-700 max-w-[90px] truncate hidden sm:inline">
                  {customer?.full_name || profile.displayName}
                </span>
              </div>
            ) : (
              <button
                onClick={login}
                className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#06C755] text-white hover:bg-[#05b34c] shadow-sm transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ LINE</span>
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-resort-600"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
