'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, parseISO } from 'date-fns';
import { calculateNights, formatDateShort } from '@/lib/formatters';
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
  const defaultCheckOut = initialCheckOut || format(addDays(new Date(), 2), 'yyyy-MM-dd');

  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [nights, setNights] = useState(2);
  const [isGuestOpen, setIsGuestOpen] = useState(false);

  useEffect(() => {
    const n = calculateNights(checkIn, checkOut);
    setNights(n);
  }, [checkIn, checkOut]);

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckIn = e.target.value;
    setCheckIn(newCheckIn);
    // If checkOut <= newCheckIn, automatically adjust checkOut to +1 day
    if (checkOut <= newCheckIn) {
      try {
        const nextDay = format(addDays(parseISO(newCheckIn), 1), 'yyyy-MM-dd');
        setCheckOut(nextDay);
      } catch {
        // ignore
      }
    }
  };

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckOut = e.target.value;
    if (newCheckOut > checkIn) {
      setCheckOut(newCheckOut);
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
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
        <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-resort-50 rounded-lg text-xs font-semibold text-resort-700">
          <span>ระยะเวลาเข้าพัก:</span>
          <span className="bg-white px-2 py-0.5 rounded shadow-sm text-resort-800 font-bold">{nights} คืน</span>
        </div>

        {/* Guests Selector */}
        <div className="md:col-span-2 relative">
          <div
            onClick={() => setIsGuestOpen(!isGuestOpen)}
            className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 border border-slate-200 cursor-pointer transition-colors"
          >
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-resort-600" />
              <span>ผู้เข้าพัก</span>
            </label>
            <div className="text-sm font-bold text-slate-800">
              {guests} ท่าน
            </div>
          </div>

          {/* Guest dropdown popup */}
          {isGuestOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-sm">จำนวนผู้เข้าพัก</div>
                  <div className="text-xs text-slate-500">ผู้ใหญ่และเด็ก</div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuests(Math.max(1, guests - 1));
                    }}
                    className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                  >
                    -
                  </button>
                  <span className="font-bold text-slate-900 w-4 text-center">{guests}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGuests(Math.min(10, guests + 1));
                    }}
                    className="w-8 h-8 rounded-full border border-resort-500 text-resort-600 flex items-center justify-center font-bold hover:bg-resort-50"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuestOpen(false)}
                className="w-full mt-4 py-1.5 bg-resort-600 text-white rounded-lg text-xs font-semibold hover:bg-resort-700"
              >
                ยืนยัน
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
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
