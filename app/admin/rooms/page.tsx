'use client';

import React, { useState, useEffect } from 'react';
import { Room, RoomType } from '@/types/database';
import { formatCurrency } from '@/lib/formatters';
import {
  BedDouble,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Room modal state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [pricePerNight, setPricePerNight] = useState<number>(1500);
  const [capacity, setCapacity] = useState<number>(2);
  const [details, setDetails] = useState('');
  const [amenitiesInput, setAmenitiesInput] = useState('Free Wi-Fi, Air Conditioning, Breakfast Included');
  const [imageUrl, setImageUrl] = useState('');
  const [roomStatus, setRoomStatus] = useState<Room['status']>('available');

  // Room Type modal state
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrice, setNewTypePrice] = useState<number>(1500);
  const [newTypeCover, setNewTypeCover] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rRes, tRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/room-types'),
      ]);
      const rData = await rRes.json();
      const tData = await tRes.json();

      if (rData.success) setRooms(rData.rooms || []);
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

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setRoomName('');
    setRoomTypeId(roomTypes[0]?.id || '');
    setPricePerNight(1500);
    setCapacity(2);
    setDetails('');
    setAmenitiesInput('Free Wi-Fi, Air Conditioning, Breakfast Included');
    setImageUrl('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80');
    setRoomStatus('available');
    setIsRoomModalOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomNumber(room.room_number);
    setRoomName(room.room_name);
    setRoomTypeId(room.room_type_id);
    setPricePerNight(Number(room.price_per_night));
    setCapacity(room.capacity);
    setDetails(room.details || '');
    setAmenitiesInput((room.amenities || []).join(', '));
    setImageUrl(room.room_images?.[0]?.image_url || '');
    setRoomStatus(room.status);
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amenities = amenitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
    const images = imageUrl ? [{ image_url: imageUrl, caption: roomName }] : [];

    const payload = {
      room_number: roomNumber,
      room_name: roomName,
      room_type_id: roomTypeId,
      price_per_night: pricePerNight,
      capacity,
      details,
      amenities,
      status: roomStatus,
      images,
      actorName: 'Admin',
    };

    try {
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms';
      const method = editingRoom ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to save room');
        return;
      }

      setIsRoomModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save room error:', err);
      setErrorMsg('Error saving room');
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบห้องพักนี้?')) return;
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Cannot delete room');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Delete room error:', err);
    }
  };

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      const res = await fetch('/api/room-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTypeName,
          base_price: newTypePrice,
          cover_image: newTypeCover,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsTypeModalOpen(false);
        setNewTypeName('');
        fetchData();
      }
    } catch (err) {
      console.error('Create room type error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BedDouble className="w-7 h-7 text-resort-600" />
            <span>จัดการห้องพัก (Rooms & Categories)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            เพิ่ม แก้ไข และกำหนดราคาและสถานะห้องพักในรีสอร์ท
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTypeModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-resort-600" />
            <span>+ เพิ่มประเภทห้อง</span>
          </button>
          <button
            onClick={openAddRoom}
            className="px-4 py-2 bg-resort-700 hover:bg-resort-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มห้องพักใหม่</span>
          </button>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">กำลังโหลดห้องพัก...</div>
        ) : rooms.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="text-3xl">🛏️</div>
            <h3 className="text-sm font-bold text-slate-800">ยังไม่มีห้องพักในระบบ</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              กดปุ่ม &quot;+ เพิ่มห้องพักใหม่&quot; ด้านบน เพื่อเริ่มสร้างห้องพักจริงในรีสอร์ทของคุณ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">เลขห้อง</th>
                  <th className="p-3">รูปภาพ</th>
                  <th className="p-3">ชื่อห้องพัก</th>
                  <th className="p-3">ประเภท</th>
                  <th className="p-3">ราคา/คืน</th>
                  <th className="p-3">ความจุ</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-resort-700">
                      ห้อง {room.room_number}
                    </td>
                    <td className="p-3">
                      <img
                        src={
                          room.room_images?.[0]?.image_url ||
                          room.room_type?.cover_image ||
                          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200&auto=format&fit=crop&q=80'
                        }
                        alt=""
                        className="w-12 h-10 rounded-lg object-cover border border-slate-200"
                      />
                    </td>
                    <td className="p-3 font-bold text-slate-800">{room.room_name}</td>
                    <td className="p-3 text-slate-600">{room.room_type?.name || '-'}</td>
                    <td className="p-3 font-bold text-slate-900">{formatCurrency(room.price_per_night)}</td>
                    <td className="p-3 text-slate-600">{room.capacity} ท่าน</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          room.status === 'available'
                            ? 'bg-green-100 text-green-700'
                            : room.status === 'maintenance'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => openEditRoom(room)}
                        className="p-1.5 text-slate-600 hover:text-resort-700 hover:bg-resort-50 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingRoom ? 'แก้ไขข้อมูลห้องพัก' : 'เพิ่มห้องพักใหม่'}
            </h2>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveRoom} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เลขห้อง (Room Number) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 101, V01"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อห้องพัก *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Deluxe Sea View Villa"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ประเภทห้อง *</label>
                  <select
                    value={roomTypeId}
                    onChange={(e) => setRoomTypeId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {roomTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาต่อคืน (บาท) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนผู้เข้าพัก</label>
                  <input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">สถานะห้องพัก</label>
                <select
                  value={roomStatus}
                  onChange={(e) => setRoomStatus(e.target.value as Room['status'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="available">ว่าง (Available)</option>
                  <option value="booked">จองแล้ว (Booked)</option>
                  <option value="occupied">เข้าพัก (Occupied)</option>
                  <option value="maintenance">ปิดปรับปรุง (Maintenance)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รูปภาพห้องพัก (Image URL)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">สิ่งอำนวยความสะดวก (คั่นด้วยจุลภาค)</label>
                <input
                  type="text"
                  placeholder="Free Wi-Fi, เครื่องปรับอากาศ, อาหารเช้า"
                  value={amenitiesInput}
                  onChange={(e) => setAmenitiesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รายละเอียดเพิ่มเติม</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดห้องพัก วิวทะเล เตียงคิงไซส์..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-resort-700 hover:bg-resort-800 text-white rounded-xl font-bold"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              เพิ่มประเภทห้องพักใหม่
            </h2>
            <form onSubmit={handleCreateRoomType} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อประเภทห้อง (เช่น Deluxe Villa) *</label>
                <input
                  type="text"
                  required
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">ราคาเริ่มต้น (บาท)</label>
                <input
                  type="number"
                  min={0}
                  value={newTypePrice}
                  onChange={(e) => setNewTypePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">รูปภาพหน้าปก (Cover URL)</label>
                <input
                  type="url"
                  value={newTypeCover}
                  onChange={(e) => setNewTypeCover(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-resort-700 text-white rounded-xl font-bold"
                >
                  เพิ่มประเภทห้อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
