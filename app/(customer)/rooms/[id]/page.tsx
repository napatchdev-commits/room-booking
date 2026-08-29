'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Room, Settings } from '@/types/database';
import { formatCurrency, calculateNights } from '@/lib/formatters';
import {
  Users,
  Wifi,
  Wind,
  Coffee,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Camera,
  X,
  Sparkles,
  Grid,
} from 'lucide-react';
import Link from 'next/link';
import { format, addDays } from 'date-fns';

export default function RoomDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const checkIn = searchParams.get('checkIn') || todayStr;
  const checkOut = searchParams.get('checkOut') || format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const guests = parseInt(searchParams.get('guests') || '2', 10);

  const [room, setRoom] = useState<Room | null>(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/rooms/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.room) {
          setRoom(d.room);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-resort-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-slate-400 mt-3">กำลังโหลดข้อมูลห้องพัก...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-3">
        <p className="text-base font-bold text-slate-800">ไม่พบข้อมูลห้องพักนี้</p>
        <Link
          href="/rooms"
          className="inline-flex items-center text-xs font-bold text-resort-700 bg-resort-50 px-4 py-2 rounded-xl"
        >
          &larr; กลับหน้ารายการห้องพัก
        </Link>
      </div>
    );
  }

  const images = (room.room_images && room.room_images.length > 0)
    ? room.room_images.map((img) => img.image_url)
    : [
        room.room_type?.cover_image ||
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
      ];

  const nights = Math.max(1, calculateNights(checkIn, checkOut));
  const pricePerNight = Number(room.price_per_night || 0);
  const totalPrice = pricePerNight * nights;

  const checkoutUrl = `/checkout?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;

  const nextLightboxImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevLightboxImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Back Button */}
      <Link
        href="/rooms"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับหน้ารายการห้องพักทั้งหมด</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header Title & Pricing */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-resort-700 uppercase tracking-wider bg-resort-50 px-2.5 py-1 rounded-lg">
                {room.room_type?.name || 'Standard'}
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                ห้อง {room.room_number}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              {room.room_name}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-400">ราคาห้องพัก</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-resort-700">
              {formatCurrency(pricePerNight)}
              <span className="text-xs text-slate-500 font-medium"> / คืน</span>
            </div>
          </div>
        </div>

        {/* Agoda / Airbnb Style Multi-Photo Hero Layout */}
        <div className="space-y-3">
          {images.length === 1 ? (
            /* Single Image Hero */
            <div
              onClick={() => {
                setSelectedImgIndex(0);
                setIsLightboxOpen(true);
              }}
              className="relative h-72 sm:h-96 md:h-[420px] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-100"
            >
              <img
                src={images[0]}
                alt={room.room_name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : images.length <= 4 ? (
            /* 2 to 4 Images Split Layout */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-auto md:h-[400px]">
              <div
                onClick={() => {
                  setSelectedImgIndex(0);
                  setIsLightboxOpen(true);
                }}
                className="md:col-span-8 h-64 md:h-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-100 relative"
              >
                <img
                  src={images[0]}
                  alt={room.room_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3 h-full">
                {images.slice(1, 3).map((img, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedImgIndex(i + 1);
                      setIsLightboxOpen(true);
                    }}
                    className="h-32 md:h-[194px] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-100 relative"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 5+ Images Agoda Gallery Grid */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-auto md:h-[420px]">
              <div
                onClick={() => {
                  setSelectedImgIndex(0);
                  setIsLightboxOpen(true);
                }}
                className="md:col-span-7 h-72 md:h-full rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-100 relative"
              >
                <img
                  src={images[0]}
                  alt={room.room_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="md:col-span-5 grid grid-cols-2 gap-3 h-full">
                {images.slice(1, 5).map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedImgIndex(idx + 1);
                      setIsLightboxOpen(true);
                    }}
                    className="h-36 md:h-[202px] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-slate-100 relative"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* +X More Photos Overlay on the 4th tile */}
                    {idx === 3 && images.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white font-bold transition-all group-hover:bg-black/70">
                        <Grid className="w-6 h-6 mb-1" />
                        <span className="text-sm">ดูรูปทั้งหมด</span>
                        <span className="text-xs text-white/80">({images.length} รูป)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedImgIndex(i);
                      setIsLightboxOpen(true);
                    }}
                    className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-slate-200 hover:border-resort-600 transition-all opacity-80 hover:opacity-100 shadow-sm"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap ml-2 shadow-sm transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-resort-600" />
                <span>ดูทั้งหมด ({images.length} รูป)</span>
              </button>
            </div>
          )}
        </div>

        {/* Room Information & Booking Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-slate-100">
          {/* Left Column: Details & Amenities */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">
                รายละเอียดห้องพัก
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {room.details || 'ห้องพักบรรยากาศสงบ ตกแต่งอย่างประณีต พร้อมสิ่งอำนวยความสะดวกครบครัน เพื่อความผ่อนคลายสูงสุดของคุณ'}
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-3">
                สิ่งอำนวยความสะดวกในห้องพัก
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
                {(room.amenities || []).map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl font-medium">
                    <CheckCircle2 className="w-4 h-4 text-resort-600 flex-shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking Summary Box */}
          <div className="lg:col-span-4">
            <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-200/90 space-y-4 sticky top-20 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200/70 pb-3">
                สรุปการจองห้องพัก
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">วันเช็คอิน:</span>
                  <span className="font-bold text-slate-800">{checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">วันเช็คเอาท์:</span>
                  <span className="font-bold text-slate-800">{checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวนคืน:</span>
                  <span className="font-bold text-resort-700">{nights} คืน</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ความจุผู้เข้าพัก:</span>
                  <span className="font-bold text-slate-800">สูงสุด {room.capacity} ท่าน</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-xs text-slate-600 font-semibold">ยอดรวม ({nights} คืน):</span>
                <span className="text-xl font-extrabold text-resort-700">{formatCurrency(totalPrice)}</span>
              </div>

              <Link
                href={checkoutUrl}
                className="w-full py-3.5 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white font-bold text-sm rounded-xl shadow-md shadow-resort-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <span>ดำเนินการจองห้องนี้</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-10">
            <div className="text-xs font-semibold">
              {room.room_name} • รูปที่ {selectedImgIndex + 1} จาก {images.length}
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Photo View */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img
              src={images[selectedImgIndex]}
              alt=""
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={prevLightboxImg}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextLightboxImg}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto py-2 z-10">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImgIndex(i);
                  }}
                  className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    selectedImgIndex === i ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
