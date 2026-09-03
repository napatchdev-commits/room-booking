'use client';

import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Room, Booking } from '@/types/database';
import { formatDateShort } from '@/lib/formatters';
import { WalkInModal } from '@/components/admin/WalkInModal';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Info,
  Check,
  Clock,
  User,
  UserCheck,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

export default function RoomCalendarPage() {
  const [startDate, setStartDate] = useState(new Date());
  const [daysCount, setDaysCount] = useState(14); // show 14 days
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Walk-in modal state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [walkInRoomId, setWalkInRoomId] = useState<string | undefined>(undefined);
  const [walkInDate, setWalkInDate] = useState<string | undefined>(undefined);

  const dates = eachDayOfInterval({
    start: startDate,
    end: addDays(startDate, daysCount - 1),
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/bookings?isAdmin=true'),
      ]);
      const roomsData = await roomsRes.json();
      const bookingsData = await bookingsRes.json();

      if (roomsData.success) setRooms(roomsData.rooms || []);
      if (bookingsData.success) setBookings(bookingsData.bookings || []);
    } catch (err) {
      console.error('Calendar data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const nextPeriod = () => setStartDate(addDays(startDate, 7));
  const prevPeriod = () => setStartDate(subDays(startDate, 7));
  const todayPeriod = () => setStartDate(new Date());

  // Find booking for a specific room and day
  const getDayBooking = (roomId: string, date: Date): Booking | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return (
      bookings.find((b) => {
        if (b.status === 'CANCELLED') return false;
        const hasRoom = b.booking_items?.some((item) => item.room_id === roomId);
        if (!hasRoom) return false;
        // Stay interval: check_in <= date < check_out
        return dateStr >= b.check_in_date && dateStr < b.check_out_date;
      }) || null
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-resort-600" />
            <span>ปฏิทินสถานะห้องพัก (Room Calendar)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ตารางแสดงห้องพักว่างและการจองแบบ Timeline Matrix
          </p>
        </div>

        {/* Action Buttons & Date Navigator */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setWalkInRoomId(undefined);
              setWalkInDate(format(new Date(), 'yyyy-MM-dd'));
              setIsWalkInModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>+ รับลูกค้า Walk-in</span>
          </button>
          <button
            onClick={todayPeriod}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
          >
            วันนี้
          </button>
          <button
            onClick={prevPeriod}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 px-2">
            {formatDateShort(startDate)} - {formatDateShort(addDays(startDate, daysCount - 1))}
          </span>
          <button
            onClick={nextPeriod}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend Badges */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600">ว่าง (Available)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-slate-600">รอชำระเงิน (Pending)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <span className="text-slate-600">ยืนยันแล้ว (Confirmed)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-600" />
          <span className="text-slate-600">เข้าพักอยู่ (Checked-in)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="text-slate-600">ปิดปรับปรุง (Maintenance)</span>
        </div>
      </div>

      {/* Gantt Timeline Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">กำลังโหลดตารางปฏิทิน...</div>
        ) : rooms.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            ยังไม่มีห้องพักในระบบ กรุณาเพิ่มห้องพักก่อน
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-left font-bold text-slate-700 min-w-[140px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                    ห้องพัก / วันที่
                  </th>
                  {dates.map((date, idx) => {
                    const isToday = isSameDay(date, new Date());
                    return (
                      <th
                        key={idx}
                        className={`p-2 text-center font-bold min-w-[50px] border-r border-slate-100 ${
                          isToday ? 'bg-resort-50 text-resort-700' : 'text-slate-600'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 uppercase">
                          {format(date, 'EEE')}
                        </div>
                        <div className={`text-xs ${isToday ? 'font-extrabold text-resort-700' : ''}`}>
                          {format(date, 'd/M')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => {
                  return (
                    <tr key={room.id} className="hover:bg-slate-50/50">
                      {/* Room Header */}
                      <td className="p-3 font-bold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="w-3.5 h-3.5 text-resort-600 flex-shrink-0" />
                          <span className="truncate">{room.room_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          ห้อง {room.room_number} • {room.room_type?.name}
                        </div>
                      </td>

                      {/* Dates cells */}
                      {dates.map((date, dIdx) => {
                        const isMaintenance = room.status === 'maintenance';
                        const booking = getDayBooking(room.id, date);

                        if (isMaintenance) {
                          return (
                            <td key={dIdx} className="p-1 border-r border-slate-100 bg-slate-100">
                              <div className="h-9 rounded bg-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600">
                                ซ่อม
                              </div>
                            </td>
                          );
                        }

                        if (booking) {
                          const isCheckIn = format(date, 'yyyy-MM-dd') === booking.check_in_date;
                          const badgeColor =
                            booking.status === 'CONFIRMED'
                              ? 'bg-blue-600 text-white'
                              : booking.status === 'CHECKED_IN'
                              ? 'bg-purple-600 text-white'
                              : 'bg-amber-500 text-white';

                          return (
                            <td key={dIdx} className="p-1 border-r border-slate-100">
                              <button
                                onClick={() => setSelectedBooking(booking)}
                                className={`w-full h-9 rounded ${badgeColor} flex flex-col items-center justify-center text-[9px] font-bold px-1 overflow-hidden transition-transform hover:scale-105 shadow-sm`}
                              >
                                <span className="truncate">{booking.customer?.full_name?.split(' ')[0] || 'จองแล้ว'}</span>
                                {isCheckIn && <span className="text-[8px] opacity-80">IN</span>}
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td key={dIdx} className="p-1 border-r border-slate-100">
                            <button
                              onClick={() => {
                                setWalkInRoomId(room.id);
                                setWalkInDate(format(date, 'yyyy-MM-dd'));
                                setIsWalkInModalOpen(true);
                              }}
                              title={`คลิกเพื่อเช็คอิน Walk-in ห้อง ${room.room_number} (${format(date, 'yyyy-MM-dd')})`}
                              className="w-full h-9 rounded bg-emerald-50 hover:bg-emerald-100 hover:border hover:border-emerald-300 flex items-center justify-center text-emerald-600 hover:text-emerald-800 text-[10px] font-bold transition-all group"
                            >
                              <span className="group-hover:hidden">-</span>
                              <span className="hidden group-hover:inline text-[9px] font-extrabold">+ รับ</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Booking Quick Popup */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold text-resort-700 bg-resort-50 px-2 py-0.5 rounded">
                {selectedBooking.booking_number}
              </span>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div><span className="text-slate-500">ผู้เข้าพัก:</span> <span className="font-bold text-slate-900">{selectedBooking.customer?.full_name}</span></div>
              <div><span className="text-slate-500">เบอร์โทร:</span> <span className="font-bold text-slate-900">{selectedBooking.customer?.phone}</span></div>
              <div><span className="text-slate-500">เข้าพัก:</span> <span className="font-semibold text-slate-800">{selectedBooking.check_in_date} ถึง {selectedBooking.check_out_date} ({selectedBooking.total_nights} คืน)</span></div>
              <div><span className="text-slate-500">สถานะ:</span> <span className="font-bold text-resort-700">{selectedBooking.status}</span></div>
            </div>

            <div className="pt-2 flex gap-2">
              <Link
                href={`/admin/bookings/${selectedBooking.id}`}
                className="flex-1 py-2 bg-resort-700 text-white rounded-xl text-xs font-bold text-center hover:bg-resort-800"
              >
                ดูรายละเอียดเต็ม
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Modal */}
      <WalkInModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        initialRoomId={walkInRoomId}
        initialDate={walkInDate}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
