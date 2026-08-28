'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, parseISO } from 'date-fns';
import { calculateNights } from '@/lib/formatters';
import { Calendar as CalendarIcon, Users, Search, Moon } from 'lucide-react';

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
      className={`bg-white rounded-2xl shadow-xl border border-slate-200/80 p-3 md:p-4 ${
        compact ? 'max-w-4xl' : 'max-w-5xl'
      } mx-auto transition-all`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center">
        {/* Check-in Date */}
        <div className="md:col-span-4 relative bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 transition-colors">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-resort-600" />
            <span>วันเช็คอิน (Check-in)</span>
          </label>
          <input
            type="date"
            min={todayStr}
            value={checkIn}
            onChange={handleCheckInChange}
            required
            className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Nights Badge (Agoda Style) */}
        <div className="hidden md:flex md:col-span-1 justify-center">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-resort-50 text-resort-700 text-xs font-bold border border-resort-200 shadow-sm whitespace-nowrap">
            <Moon className="w-3 h-3 text-resort-500" />
            <span>{nights} คืน</span>
          </div>
        </div>

        {/* Check-out Date */}
        <div className="md:col-span-3 relative bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 transition-colors">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-resort-600" />
            <span>วันเช็คเอาท์ (Check-out)</span>
          </label>
          <input
            type="date"
            min={checkIn ? format(addDays(parseISO(checkIn), 1), 'yyyy-MM-dd') : todayStr}
            value={checkOut}
            onChange={handleCheckOutChange}
            required
            className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Mobile Nights Indicator */}
        <div className="md:hidden sm:col-span-2 flex items-center justify-between px-3 py-1.5 bg-resort-50 rounded-lg text-xs font-semibold text-resort-700">
          <span>ระยะเวลาเข้าพัก:</span>
          <span className="bg-white px-2 py-0.5 rounded shadow-sm text-resort-800 font-bold">{nights} คืน</span>
        </div>

        {/* Direct Accessible Guests Selector */}
        <div className="md:col-span-2 relative bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 transition-colors">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-resort-600" />
            <span>ผู้เข้าพัก</span>
          </label>
          <select
            value={guests}
            onChange={handleGuestsChange}
            className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer font-sans"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num} className="font-medium text-slate-800 py-1">
                {num} ท่าน
              </option>
            ))}
          </select>
        </div>

        {/* Submit Search Button */}
        <div className="md:col-span-2 sm:col-span-2">
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-sm rounded-xl shadow-md shadow-resort-700/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>ค้นหาห้องว่าง</span>
          </button>
        </div>
      </div>
    </form>
  );
}
