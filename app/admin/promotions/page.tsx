'use client';

import React, { useState, useEffect } from 'react';
import { Promotion, RoomType } from '@/types/database';
import { formatCurrency, formatDateThai } from '@/lib/formatters';
import { Sparkles, Plus, Tag, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { format, addMonths } from 'date-fns';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minNights, setMinNights] = useState<number>(1);
  const [applicableRoomTypeId, setApplicableRoomTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [isActive, setIsActive] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/promotions'),
        fetch('/api/room-types'),
      ]);
      const pData = await pRes.json();
      const tData = await tRes.json();

      if (pData.success) setPromotions(pData.promotions || []);
      if (tData.success) setRoomTypes(tData.roomTypes || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name,
          description,
          discount_type: discountType,
          discount_value: discountValue,
          min_nights: minNights,
          applicable_room_type_id: applicableRoomTypeId || null,
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
          actorName: 'Admin',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to create promotion');
        return;
      }

      setIsModalOpen(false);
      setCode('');
      setName('');
      setDescription('');
      fetchData();
    } catch (err) {
      console.error('Promo create error:', err);
      setErrorMsg('Error connecting to server');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch('/api/promotions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive, actorName: 'Admin' }),
      });
      fetchData();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-orange-500" />
            <span>จัดการโปรโมชั่น (Promotions & Discounts)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            สร้างโปรโมชั่นลดเป็น % หรือบาท กำหนดเงื่อนไขวันและห้องพัก
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ สร้างโปรโมชั่นใหม่</span>
        </button>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">กำลังโหลดโปรโมชั่น...</div>
        ) : promotions.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="text-3xl">🏷️</div>
            <h3 className="text-sm font-bold text-slate-800">ยังไม่มีโปรโมชั่นในระบบ</h3>
            <p className="text-xs text-slate-400">
              คลิก &quot;+ สร้างโปรโมชั่นใหม่&quot; เพื่อเพิ่มโปรโมชั่นดึงดูดลูกค้า
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">โค้ดส่วนลด</th>
                  <th className="p-3">ชื่อโปรโมชั่น</th>
                  <th className="p-3">มูลค่าส่วนลด</th>
                  <th className="p-3">พักขั้นต่ำ</th>
                  <th className="p-3">ประเภทห้อง</th>
                  <th className="p-3">ระยะเวลาที่ใช้ได้</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">เปิด/ปิด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-orange-600">
                      <span className="bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {promo.code}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{promo.name}</td>
                    <td className="p-3 font-extrabold text-slate-900">
                      {promo.discount_type === 'PERCENTAGE'
                        ? `ลด ${promo.discount_value}%`
                        : `ลด ${formatCurrency(promo.discount_value)}`}
                    </td>
                    <td className="p-3 text-slate-600">{promo.min_nights} คืน</td>
                    <td className="p-3 text-slate-600">
                      {promo.applicable_room_type_id ? promo.room_type?.name || 'เฉพาะประเภท' : 'ทุกห้อง'}
                    </td>
                    <td className="p-3 text-slate-500">
                      {promo.start_date} &rarr; {promo.end_date}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          promo.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {promo.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleActive(promo.id, promo.is_active)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          promo.is_active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        }`}
                      >
                        {promo.is_active ? 'ปิด' : 'เปิด'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Promotion Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              สร้างโปรโมชั่นใหม่
            </h2>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreatePromotion} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">โค้ดโปรโมชั่น (Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น EARLYBIRD, SUMMER10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อโปรโมชั่น *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ส่วนลดจองล่วงหน้า 10%"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รูปแบบส่วนลด *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="PERCENTAGE">เปอร์เซ็นต์ (%)</option>
                    <option value="FIXED_AMOUNT">จำนวนเงินคงที่ (บาท)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">มูลค่าส่วนลด *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนคืนขั้นต่ำ</label>
                  <input
                    type="number"
                    min={1}
                    value={minNights}
                    onChange={(e) => setMinNights(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เฉพาะประเภทห้อง</label>
                  <select
                    value={applicableRoomTypeId}
                    onChange={(e) => setApplicableRoomTypeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">ทุกประเภทห้อง</option>
                    {roomTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันเริ่มต้น *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วันสิ้นสุด *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รายละเอียด</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดเงื่อนไขโปรโมชั่น..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-resort-700 text-white rounded-xl font-bold shadow-md"
                >
                  บันทึกโปรโมชั่น
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
