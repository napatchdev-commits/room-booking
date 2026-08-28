'use client';

import React, { useState, useEffect } from 'react';
import { RoomCard } from '@/components/ui/RoomCard';
import { AgodaSearchBar } from '@/components/ui/AgodaSearchBar';
import { Room, RoomType } from '@/types/database';
import { BedDouble, Filter } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function RoomsCatalogPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultCheckOut = format(addDays(new Date(), 2), 'yyyy-MM-dd');

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(2);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRooms = async (cIn: string, cOut: string, g: number, typeId?: string) => {
    setIsLoading(true);
    try {
      let url = `/api/rooms/available?checkIn=${cIn}&checkOut=${cOut}&guests=${g}`;
      if (typeId && typeId !== 'ALL') {
        url += `&roomTypeId=${typeId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/room-types')
      .then((r) => r.json())
      .then((d) => d.success && setRoomTypes(d.roomTypes || []))
      .catch(() => {});

    fetchRooms(checkIn, checkOut, guests, selectedType);
  }, [checkIn, checkOut, guests, selectedType]);

  const handleSearch = (params: { checkIn: string; checkOut: string; guests: number }) => {
    setCheckIn(params.checkIn);
    setCheckOut(params.checkOut);
    setGuests(params.guests);
    fetchRooms(params.checkIn, params.checkOut, params.guests, selectedType);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <BedDouble className="w-7 h-7 text-resort-600" />
          <span>ห้องพักทั้งหมด (Rooms & Suites)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          เลือกห้องพักที่เหมาะกับสไตล์การพักผ่อนของคุณ พร้อมตรวจสอบห้องว่างได้ทันที
        </p>
      </div>

      {/* Compact Agoda Search Bar */}
      <AgodaSearchBar
        initialCheckIn={checkIn}
        initialCheckOut={checkOut}
        initialGuests={guests}
        onSearch={handleSearch}
        compact
      />

      {/* Category Pills */}
      {roomTypes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedType === 'ALL'
                ? 'bg-resort-700 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({rooms.length})
          </button>
          {roomTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedType === type.id
                  ? 'bg-resort-700 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
      )}

      {/* Rooms List */}
      {isLoading ? (
        <div className="space-y-4 py-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="text-3xl">🌴</div>
          <h3 className="text-base font-bold text-slate-800">
            ไม่พบห้องว่างสำหรับเงื่อนไขที่เลือก
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ลองปรับเปลี่ยนวันที่เข้าพัก หรือเลือกดูประเภทห้องพักอื่น
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
            />
          ))}
        </div>
      )}
    </div>
  );
}
