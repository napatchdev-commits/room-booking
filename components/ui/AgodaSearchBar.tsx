'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, parseISO } from 'date-fns';
import { calculateNights, formatDateThai } from '@/lib/formatters';
import { Calendar as CalendarIcon, Users, Search, Moon, ChevronDown } from 'lucide-react';

interface AgodaSearchBarProps {
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  onSearch?: (params: { checkIn: string; checkOut: string; guests: number }) => void;
  compact?: boolean;
}

export function AgodaSearchBar({
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  onSearch,
  compact = false,
}: AgodaSearchBarProps) {
  const router = useRouter();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultCheckIn = initialCheckIn || todayStr;
  const defaultCheckOut = initialCheckOut || format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(initialGuests || 2);
  const [nights, setNights] = useState(1);

  // Sync state if initial props change
  useEffect(() => {
    if (initialCheckIn) setCheckIn(initialCheckIn);
    if (initialCheckOut) setCheckOut(initialCheckOut);
    if (initialGuests) setGuests(initialGuests);
  }, [initialCheckIn, initialCheckOut, initialGuests]);

  useEffect(() => {
    const n = calculateNights(checkIn, checkOut);
    setNights(Math.max(1, n));
  }, [checkIn, checkOut]);

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckIn = e.target.value;
    setCheckIn(newCheckIn);
    let newCheckOut = checkOut;
    if (checkOut <= newCheckIn) {
      try {
        newCheckOut = format(addDays(parseISO(newCheckIn), 1), 'yyyy-MM-dd');
        setCheckOut(newCheckOut);
      } catch {
        // ignore
      }
    }
    if (onSearch) {
      onSearch({ checkIn: newCheckIn, checkOut: newCheckOut, guests });
    }
  };

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckOut = e.target.value;
    if (newCheckOut > checkIn) {
      setCheckOut(newCheckOut);
      if (onSearch) {
        onSearch({ checkIn, checkOut: newCheckOut, guests });
      }
    }
  };

  const handleGuestsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGuests = parseInt(e.target.value, 10) || 2;
    setGuests(newGuests);
    if (onSearch) {
      onSearch({ checkIn, checkOut, guests: newGuests });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({ checkIn, checkOut, guests });
    } else {
      router.push(`/?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}#rooms-section`);
    }
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className={`bg-white rounded-3xl shadow-2xl shadow-slate-900/15 border border-slate-100 p-3 sm:p-4 ${
        compact ? 'max-w-4xl' : 'max-w-5xl'
      } mx-auto transition-all`}
    >
      {/* ==========================================
          MOBILE LAYOUT (< md) - Compact & Elegant
          ========================================== */}
      <div className="md:hidden space-y-2.5">
        {/* Row 1: Check-in & Check-out side-by-side with floating nights pill */}
        <div className="relative grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
          {/* Check-in */}
          <div className="relative px-2 py-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CalendarIcon className="w-3 h-3 text-resort-600" />
              <span>เช็คอิน</span>
            </label>
            <div className="text-xs font-extrabold text-slate-900 mt-0.5">
              {formatDateThai(checkIn)}
            </div>
            <input
              type="date"
              min={todayStr}
              value={checkIn}
              onChange={handleCheckInChange}
              required
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>

          {/* Center Floating Nights Pill */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full bg-white text-resort-800 text-[10px] font-extrabold shadow-sm border border-resort-200 whitespace-nowrap flex items-center gap-0.5">
              <Moon className="w-2.5 h-2.5 text-resort-600" />
              <span>{nights} คืน</span>
            </span>
          </div>

          {/* Check-out */}
          <div className="relative px-2 py-1 text-right">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-end gap-1">
              <span>เช็คเอาท์</span>
              <CalendarIcon className="w-3 h-3 text-resort-600" />
            </label>
            <div className="text-xs font-extrabold text-slate-900 mt-0.5">
              {formatDateThai(checkOut)}
            </div>
            <input
              type="date"
              min={checkIn ? format(addDays(parseISO(checkIn), 1), 'yyyy-MM-dd') : todayStr}
              value={checkOut}
              onChange={handleCheckOutChange}
              required
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
        </div>

        {/* Row 2: Guests Selector & Submit Search Button */}
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Guests Selector (5 cols) */}
          <div className="col-span-5 relative bg-slate-50 p-2 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-resort-600" />
                <span>ผู้เข้าพัก</span>
              </label>
              <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                {guests} ท่าน
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={guests}
              onChange={handleGuestsChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer font-sans"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} ท่าน
                </option>
              ))}
            </select>
          </div>

          {/* Search Button (7 cols) */}
          <div className="col-span-7">
            <button
              type="submit"
              className="w-full py-3 px-3 bg-gradient-to-r from-resort-700 to-resort-600 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-resort-700/25 transition-all flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>ค้นหาห้องว่าง</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          DESKTOP LAYOUT (>= md) - Clean 1-Line Bar
          ========================================== */}
      <div className="hidden md:grid md:grid-cols-12 gap-3 items-center">
        {/* Check-in Date */}
        <div className="md:col-span-4 relative bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-2.5 border border-slate-200 transition-colors">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-resort-600" />
            <span>วันเช็คอิน (Check-in)</span>
          </label>
          <input
            type="date"
            min={todayStr}
            value={checkIn}
            onChange={handleCheckInChange}
            required
            className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Nights Badge (Agoda Style) */}
        <div className="md:col-span-1 flex justify-center">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-resort-50 text-resort-800 text-xs font-bold border border-resort-200 shadow-sm whitespace-nowrap">
            <Moon className="w-3 h-3 text-resort-600" />
            <span>{nights} คืน</span>
          </div>
        </div>

        {/* Check-out Date */}
        <div className="md:col-span-3 relative bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-2.5 border border-slate-200 transition-colors">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-resort-600" />
            <span>วันเช็คเอาท์ (Check-out)</span>
          </label>
          <input
            type="date"
            min={checkIn ? format(addDays(parseISO(checkIn), 1), 'yyyy-MM-dd') : todayStr}
            value={checkOut}
            onChange={handleCheckOutChange}
            required
            className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Direct Accessible Guests Selector */}
        <div className="md:col-span-2 relative bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-2.5 border border-slate-200 transition-colors">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-resort-600" />
            <span>ผู้เข้าพัก</span>
          </label>
          <select
            value={guests}
            onChange={handleGuestsChange}
            className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer font-sans"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num} className="font-medium text-slate-800 py-1">
                {num} ท่าน
              </option>
            ))}
          </select>
        </div>

        {/* Submit Search Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-resort-700/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>ค้นหาห้องว่าง</span>
          </button>
        </div>
      </div>
    </form>
  );
}
