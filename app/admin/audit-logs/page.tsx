'use client';

import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/types/database';
import { formatDateTime } from '@/lib/formatters';
import { History, Search, Shield, Eye } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityFilter, setEntityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let url = '/api/audit-logs?limit=100';
      if (entityFilter) url += `&entity=${entityFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Audit logs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('ISSUE')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">{action}</span>;
    }
    if (action.includes('CANCEL') || action.includes('REJECT') || action.includes('DELETE')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">{action}</span>;
    }
    if (action.includes('DISCOUNT') || action.includes('VERIFY')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-7 h-7 text-resort-600" />
            <span>บันทึกประวัติการทำงาน (Audit Logs)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ติดตามทุกการเปลี่ยนแปลงสำคัญในระบบ ผู้กระทำ วันที่ เวลา และข้อมูลก่อน-หลังแก้ไข
          </p>
        </div>

        {/* Entity Filter */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
        >
          <option value="">ทั้งหมด (All Entities)</option>
          <option value="booking">Booking</option>
          <option value="payment">Payment</option>
          <option value="receipt">Receipt</option>
          <option value="discount">Manual Discount</option>
          <option value="room">Room</option>
          <option value="promotion">Promotion</option>
          <option value="setting">Setting</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">กำลังโหลดประวัติการทำงาน...</div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="text-3xl">📜</div>
            <h3 className="text-sm font-bold text-slate-800">ยังไม่มีบันทึกประวัติในระบบ</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">เวลา (Timestamp)</th>
                  <th className="p-3">ผู้ทำรายการ (Actor)</th>
                  <th className="p-3">การกระทำ (Action)</th>
                  <th className="p-3">หมวด (Entity)</th>
                  <th className="p-3">รหัสอ้างอิง (Entity ID)</th>
                  <th className="p-3 text-right">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 font-medium">{formatDateTime(log.created_at)}</td>
                    <td className="p-3 font-bold text-slate-800">{log.actor_name || 'System'}</td>
                    <td className="p-3">{getActionBadge(log.action)}</td>
                    <td className="p-3 text-slate-600 uppercase font-semibold text-[11px]">{log.entity}</td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{log.entity_id}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg inline-flex items-center gap-1 font-bold text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูข้อมูล</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">รายละเอียด Audit Log</h3>
                <span className="text-[11px] text-slate-500">{formatDateTime(selectedLog.created_at)} โดย {selectedLog.actor_name}</span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-xs font-bold text-slate-400">
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-bold text-slate-700 block mb-1">ข้อมูลก่อนแก้ไข (Before State):</span>
                <pre className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] overflow-x-auto text-slate-700">
                  {selectedLog.details_before ? JSON.stringify(selectedLog.details_before, null, 2) : 'null (None)'}
                </pre>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">ข้อมูลหลังแก้ไข (After State):</span>
                <pre className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] overflow-x-auto text-slate-700">
                  {selectedLog.details_after ? JSON.stringify(selectedLog.details_after, null, 2) : 'null (None)'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
