'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { AgodaSearchBar } from '@/components/ui/AgodaSearchBar';
import { RoomCard } from '@/components/ui/RoomCard';
import { Room, Promotion, Settings } from '@/types/database';
import { Sparkles, Palmtree, MapPin, Phone, ShieldCheck, HeartHandshake, BedDouble } from 'lucide-react';
import Link from 'next/link';

function HomeContent() {
  const searchParams = useSearchParams();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const initialCheckIn = searchParams.get('checkIn') || todayStr;
  const initialCheckOut = searchParams.get('checkOut') || format(addDays(new Date(), 2), 'yyyy-MM-dd');
  const initialGuests = parseInt(searchParams.get('guests') || '2', 10);

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available rooms
  const fetchAvailableRooms = useCallback(async (cIn: string, cOut: string, g: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/rooms/available?checkIn=${cIn}&checkOut=${cOut}&guests=${g}`);
      const data = await res.json();
      if (data.success) {
        setRooms(data.rooms || []);
      } else {
        setErrorMsg(data.error || 'Failed to search rooms');
      }
    } catch (err) {
      console.error('Error querying available rooms:', err);
      setErrorMsg('Cannot connect to database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch resort settings & active promotions
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => {});

    fetch('/api/promotions?activeOnly=true')
      .then((r) => r.json())
      .then((d) => d.success && setPromotions(d.promotions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAvailableRooms(checkIn, checkOut, guests);
  }, [checkIn, checkOut, guests, fetchAvailableRooms]);

  const handleSearch = (params: { checkIn: string; checkOut: string; guests: number }) => {
    setCheckIn(params.checkIn);
    setCheckOut(params.checkOut);
    setGuests(params.guests);
  };

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-resort-900 via-resort-800 to-resort-700 text-white pt-10 pb-20 md:pb-28 px-4 overflow-hidden">
        {/* Decorative background image overlay */}
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&auto=format&fit=crop&q=80')`,
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center space-y-3 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold tracking-wide text-resort-200">
            <Palmtree className="w-3.5 h-3.5 text-resort-300" />
            <span>สัมผัสประสบการณ์พักผ่อนระดับพรีเมียม</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {settings?.resort_name || 'Paradise Resort & Spa'}
          </h1>
          <p className="text-sm sm:text-base text-resort-100/90 max-w-2xl mx-auto font-light">
            จองห้องพักง่าย สะดวกรวดเร็วผ่าน LINE พร้อมรับสิทธิประโยชน์และโปรโมชั่นส่วนลดพิเศษทันที
          </p>
        </div>

        {/* Floating Agoda Search Bar */}
        <div className="relative -mb-28 md:-mb-36 mt-8 z-20 px-2 sm:px-4">
          <AgodaSearchBar
            initialCheckIn={checkIn}
            initialCheckOut={checkOut}
            initialGuests={guests}
            onSearch={handleSearch}
          />
        </div>
      </section>

      {/* Main Content Area */}
      <div id="rooms-section" className="max-w-6xl mx-auto px-4 pt-16 md:pt-20 space-y-10">
        {/* Active Promotion Badges Banner */}
        {promotions.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-orange-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  โปรโมชั่นพิเศษช่วงนี้! (ลดสูงสุด {promotions[0].discount_value}
                  {promotions[0].discount_type === 'PERCENTAGE' ? '%' : ' บาท'})
                </div>
                <div className="text-xs text-slate-600">
                  {promotions[0].name} — ใช้โค้ด <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{promotions[0].code}</span> ตอนชำระเงิน
                </div>
              </div>
            </div>
            <Link
              href="/promotions"
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-white px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm whitespace-nowrap"
            >
              ดูโปรโมชั่นทั้งหมด &rarr;
            </Link>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BedDouble className="w-6 h-6 text-resort-600" />
              <span>ห้องพักว่างสำหรับคุณ</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              วันที่เลือก: {checkIn} ถึง {checkOut} • ผู้เข้าพัก {guests} ท่าน
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            พบห้องว่างทั้งหมด <span className="font-bold text-resort-700">{rooms.length}</span> ห้อง
          </div>
        </div>

        {/* Available Rooms Grid / List */}
        {isLoading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-slate-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : errorMsg ? (
          <div className="p-8 text-center bg-red-50 text-red-700 rounded-2xl border border-red-200">
            <p className="font-bold">{errorMsg}</p>
            <p className="text-xs mt-1">กรุณาลองเลือกช่วงวันที่ใหม่อีกครั้ง</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-16 h-16 rounded-full bg-resort-50 text-resort-600 flex items-center justify-center mx-auto text-2xl">
              🏨
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              ยังไม่มีห้องว่างในช่วงวันที่คุณเลือก
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ห้องพักทั้งหมดอาจถูกจองเต็มแล้ว หรือยังไม่มีการเพิ่มห้องพักในระบบ กรุณาลองเลือกวันอื่น หรือติดต่อเจ้าหน้าที่
            </p>
            <div className="pt-2">
              <Link
                href="/admin/rooms"
                className="inline-flex items-center text-xs font-semibold text-resort-600 hover:text-resort-700 bg-resort-50 px-3.5 py-2 rounded-lg border border-resort-200"
              >
                + จัดการเพิ่มห้องพัก (Admin Portal)
              </Link>
            </div>
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

        {/* Resort Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-resort-50 text-resort-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">รับประกันห้องพักจริง</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                ระบบเชื่อมต่อฐานข้อมูลโดยตรง ป้องกันการจองซ้ำซ้อน 100%
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-resort-50 text-resort-600 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">ชำระเงินสะดวก</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                รองรับ PromptPay QR, มัดจำล่วงหน้า, และแบ่งชำระเป็นงวด
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-resort-50 text-resort-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">ทำเลที่ตั้งและบรรยากาศ</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {settings?.address || 'ใกล้ชิดธรรมชาติ บรรยากาศเงียบสงบ เหมาะแก่การพักผ่อน'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">กำลังโหลด...</div>}>
      <HomeContent />
    </Suspense>
  );
}
