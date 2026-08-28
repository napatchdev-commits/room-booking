'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Room, Settings } from '@/types/database';
import { formatCurrency } from '@/lib/formatters';
import { Users, Wifi, Wind, Coffee, Bed, ArrowLeft, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { format, addDays } from 'date-fns';

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultCheckOut = format(addDays(new Date(), 2), 'yyyy-MM-dd');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/rooms/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.room) {
          setRoom(d.room);
          const firstImg = d.room.room_images?.[0]?.image_url || d.room.room_type?.cover_image || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80';
          setSelectedImg(firstImg);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-resort-600 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-sm font-bold text-red-600">ไม่พบห้องพักนี้</p>
      </div>
    );
  }

  const images = (room.room_images && room.room_images.length > 0)
    ? room.room_images.map((img) => img.image_url)
    : [
        room.room_type?.cover_image ||
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
      ];

  const checkoutUrl = `/checkout?roomId=${room.id}&checkIn=${todayStr}&checkOut=${defaultCheckOut}&guests=2`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <Link
        href="/rooms"
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับหน้ารายการห้องพัก</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 md:p-8 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-resort-600 uppercase tracking-wider bg-resort-50 px-2 py-0.5 rounded-md">
              {room.room_type?.name || 'Deluxe Room'} • ห้อง {room.room_number}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {room.room_name}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-400">ราคาเริ่มต้น</div>
            <div className="text-2xl font-extrabold text-resort-700">
              {formatCurrency(room.price_per_night)}
              <span className="text-xs text-slate-500 font-medium"> / คืน</span>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="space-y-3">
          <div className="h-72 sm:h-96 w-full rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
            <img src={selectedImg} alt={room.room_name} className="w-full h-full object-cover" />
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImg(img)}
                  className={`w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                    selectedImg === img ? 'border-resort-600 scale-95 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details & Capacity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                รายละเอียดห้องพัก
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {room.details || 'ห้องพักบรรยากาศสงบ ตกแต่งสไตล์ร่วมสมัย พร้อมสิ่งอำนวยความสะดวกครบครัน เพื่อการพักผ่อนที่ลงตัว'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                สิ่งอำนวยความสะดวก
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
                {(room.amenities || []).map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-resort-600 flex-shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4 h-fit">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ความจุผู้เข้าพัก:</span>
                <span className="font-bold text-slate-800">สูงสุด {room.capacity} ท่าน</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">สถานะห้องพัก:</span>
                <span className="font-bold text-green-600 capitalize">{room.status}</span>
              </div>
            </div>

            <Link
              href={checkoutUrl}
              className="w-full py-3.5 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <span>จองห้องนี้เลย</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
