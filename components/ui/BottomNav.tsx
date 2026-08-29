'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BedDouble, CalendarSearch, Sparkles, BookOpenCheck, MessageCircle } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  // Don't show bottom nav on admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const items = [
    { href: '/', label: 'จองห้องพัก', icon: CalendarSearch },
    { href: '/rooms', label: 'ห้องพัก', icon: BedDouble },
    { href: '/promotions', label: 'โปรโมชั่น', icon: Sparkles },
    { href: '/bookings', label: 'การจองของฉัน', icon: BookOpenCheck },
    { href: '/contact', label: 'ติดต่อเรา', icon: MessageCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg md:hidden print:hidden no-print">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all ${
                isActive
                  ? 'text-resort-600 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-900 font-normal'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.href === '/promotions' && (
                  <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
