'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Room, Promotion } from '@/types/database';
import { formatCurrency, calculateNights } from '@/lib/formatters';
import {
  Users,
  Wifi,
  Wind,
  Coffee,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ChevronLeft,
  Camera,
} from 'lucide-react';

interface RoomWithPricing extends Room {
  pricing?: {
    nights: number;
    originalPricePerNight: number;
    originalSubtotal: number;
    discountAmount: number;
    netTotal: number;
    discountedPricePerNight: number;
    appliedPromotion?: Promotion | null;
    hasDiscount: boolean;
  };
}

interface RoomCardProps {
  room: RoomWithPricing;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export function RoomCard({ room, checkIn, checkOut, guests }: RoomCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = (room.room_images && room.room_images.length > 0)
    ? room.room_images.map((img) => img.image_url)
    : [
        room.room_type?.cover_image ||
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
      ];

  const originalRate = Number(room.price_per_night || 0);
  const nights = Math.max(1, calculateNights(checkIn, checkOut));
  const pricing = room.pricing;

  const discountedRate = pricing?.hasDiscount ? pricing.discountedPricePerNight : originalRate;
  const totalAmount = pricing?.hasDiscount ? pricing.netTotal : originalRate * nights;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const amenityIcons: Record<string, React.ReactNode> = {
    'Free Wi-Fi': <Wifi className="w-3.5 h-3.5" />,
    'Air Conditioning': <Wind className="w-3.5 h-3.5" />,
    'Breakfast Included': <Coffee className="w-3.5 h-3.5" />,
    'Wi-Fi': <Wifi className="w-3.5 h-3.5" />,
    'เครื่องปรับอากาศ': <Wind className="w-3.5 h-3.5" />,
    'อาหารเช้าฟรี': <Coffee className="w-3.5 h-3.5" />,
  };

  const checkoutUrl = `/checkout?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
  const detailUrl = `/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col md:flex-row group">
      {/* Image Carousel Section */}
      <div className="relative md:w-2/5 h-60 md:h-auto min-h-[240px] bg-slate-100 overflow-hidden flex-shrink-0">
        <Link href={detailUrl} className="block w-full h-full">
          <img
            src={images[currentImageIndex]}
            alt={room.room_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        {/* Promotion Badge Overlay */}
        {pricing?.hasDiscount && pricing.appliedPromotion && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider animate-pulse pointer-events-none">
            <Sparkles className="w-3 h-3" />
            <span>
              {pricing.appliedPromotion.discount_type === 'PERCENTAGE'
                ? `ลด ${pricing.appliedPromotion.discount_value}%`
                : `ลด ${formatCurrency(pricing.appliedPromotion.discount_value)}`}
            </span>
          </div>
        )}

        {/* Room Number Badge & Photo Count Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
          {images.length > 1 && (
            <div className="bg-black/60 backdrop-blur text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{currentImageIndex + 1}/{images.length}</span>
            </div>
          )}
          <div className="bg-slate-900/85 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
            ห้อง {room.room_number}
          </div>
        </div>

        {/* Navigation Arrows for Multi-Images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10 pointer-events-none">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentImageIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Room Details & Content Section */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Room Type & Name */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-resort-600 uppercase tracking-wider bg-resort-50 px-2 py-0.5 rounded-md inline-block mb-1">
                {room.room_type?.name || 'Standard Room'}
              </span>
              <Link href={detailUrl}>
                <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-resort-700 transition-colors">
                  {room.room_name}
                </h3>
              </Link>
            </div>
            <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold bg-slate-100 px-2 py-1 rounded-md flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>สูงสุด {room.capacity} ท่าน</span>
            </div>
          </div>

          {/* Description */}
          {room.details && (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
              {room.details}
            </p>
          )}

          {/* Amenities Pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(room.amenities || []).slice(0, 4).map((amenity, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-md"
              >
                {amenityIcons[amenity] || <CheckCircle2 className="w-3 h-3 text-resort-500" />}
                <span>{amenity}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Pricing & Booking Footer (Agoda Style) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">ราคาสำหรับ {nights} คืน ({formatCurrency(originalRate)}/คืน)</div>
            <div className="flex items-baseline gap-2">
              {pricing?.hasDiscount && (
                <span className="text-xs text-slate-400 line-through font-semibold">
                  {formatCurrency(originalRate)}
                </span>
              )}
              <span className="text-xl font-extrabold text-resort-700">
                {formatCurrency(discountedRate)}
              </span>
              <span className="text-xs text-slate-500 font-medium">/คืน</span>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              ยอดรวม: <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <Link
            href={checkoutUrl}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-resort-600 to-resort-700 hover:from-resort-700 hover:to-resort-800 text-white text-sm font-bold rounded-xl shadow-md shadow-resort-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
          >
            <span>จองห้องนี้</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
