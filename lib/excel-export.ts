import * as XLSX from 'xlsx';
import { Booking, Payment, Receipt, Room } from '@/types/database';
import { formatDateShort, formatDateTime, formatDateThaiLong, thaiBahtText } from './formatters';

// Export full monthly workbook with all sheets
export function exportMonthlyCompleteReport({
  year,
  month,
  monthName,
  bookings,
  payments,
  receipts,
  rooms = [],
  summary,
}: {
  year: number;
  month?: number;
  monthName?: string;
  bookings: Booking[];
  payments: Payment[];
  receipts: any[];
  rooms?: Room[];
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalOutstanding: number;
    totalPromoDiscounts: number;
    totalManualDiscounts: number;
    totalBookings: number;
    totalNights: number;
    totalReceiptsCount: number;
  };
}) {
  const periodLabel = monthName ? `${monthName} ${year + 543} (${year})` : `ปี ${year + 543} (${year})`;
  const filename = `Resort_Monthly_Report_${year}_${month ? String(month).padStart(2, '0') : 'ALL'}.xlsx`;

  const workbook = XLSX.utils.book_new();

  // ----------------------------------------------------
  // Sheet 1: สรุปภาพรวมรายเดือน (Monthly Summary)
  // ----------------------------------------------------
  const summaryRows = [
    { 'หัวข้อรายงาน': 'รายงานสรุปข้อมูลประจำเดือน', 'รายละเอียด': periodLabel },
    { 'หัวข้อรายงาน': 'วันที่สร้างรายงาน', 'รายละเอียด': formatDateTime(new Date().toISOString()) },
    { 'หัวข้อรายงาน': '----------------------------------', 'รายละเอียด': '----------------------------------' },
    { 'หัวข้อรายงาน': 'รายได้รวมสุทธิ (Net Revenue)', 'รายละเอียด': `${Number(summary.totalRevenue).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` },
    { 'หัวข้อรายงาน': 'ยอดเงินที่ชำระแล้ว (Total Paid)', 'รายละเอียด': `${Number(summary.totalPaid).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` },
    { 'หัวข้อรายงาน': 'ยอดคงเหลือค้างชำระ (Outstanding Balance)', 'รายละเอียด': `${Number(summary.totalOutstanding).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` },
    { 'หัวข้อรายงาน': 'ส่วนลดโปรโมชั่นรวม (Promotion Discounts)', 'รายละเอียด': `${Number(summary.totalPromoDiscounts).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` },
    { 'หัวข้อรายงาน': 'ส่วนลดพิเศษเพิ่มเติมรวม (Manual Discounts)', 'รายละเอียด': `${Number(summary.totalManualDiscounts).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` },
    { 'หัวข้อรายงาน': 'จำนวนการจองทั้งหมด (Total Bookings)', 'รายละเอียด': `${summary.totalBookings} รายการ` },
    { 'หัวข้อรายงาน': 'จำนวนคืนเข้าพักรวม (Total Room Nights)', 'รายละเอียด': `${summary.totalNights} คืน` },
    { 'หัวข้อรายงาน': 'จำนวนใบเสร็จที่ออก (Total Receipts)', 'รายละเอียด': `${summary.totalReceiptsCount} ใบ` },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุปภาพรวม');

  // ----------------------------------------------------
  // Sheet 2: รายการจอง (Bookings)
  // ----------------------------------------------------
  const bookingRows = bookings.map((b, idx) => {
    const roomNames = (b.booking_items || [])
      .map((it) => `${it.room_name || ''} (${it.room_number || ''})`)
      .join(', ') || '-';

    return {
      'ลำดับ': idx + 1,
      'เลขที่การจอง': b.booking_number,
      'ชื่อลูกค้า / ผู้เข้าพัก': b.customer?.full_name || '-',
      'เบอร์โทรศัพท์': b.customer?.phone || '-',
      'ห้องพัก': roomNames,
      'วันเช็คอิน': formatDateShort(b.check_in_date),
      'วันเช็คเอาท์': formatDateShort(b.check_out_date),
      'จำนวนคืน': b.total_nights,
      'จำนวนผู้เข้าพัก': b.num_guests,
      'ยอดรวมก่อนลด (บาท)': Number(b.subtotal_amount),
      'ส่วนลดโปรโมชั่น (บาท)': Number(b.promotion_discount),
      'ส่วนลดพิเศษ (บาท)': Number(b.manual_discount),
      'ยอดสุทธิ (บาท)': Number(b.net_total),
      'ชำระแล้ว (บาท)': Number(b.paid_amount),
      'ยอดคงเหลือ (บาท)': Number(b.remaining_balance),
      'สถานะการจอง': b.status,
      'วันที่ทำรายการ': formatDateTime(b.created_at),
    };
  });
  const bookingSheet = XLSX.utils.json_to_sheet(bookingRows.length > 0 ? bookingRows : [{ 'ผลลัพธ์': 'ไม่มีรายการจองในเดือนนี้' }]);
  XLSX.utils.book_append_sheet(workbook, bookingSheet, 'รายการจอง');

  // ----------------------------------------------------
  // Sheet 3: รายการชำระเงิน (Payments)
  // ----------------------------------------------------
  const paymentRows = payments.map((p: any, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสชำระเงิน': p.id,
    'เลขที่การจอง': p.booking?.booking_number || p.booking_id || '-',
    'ชื่อลูกค้า': p.booking?.customer?.full_name || '-',
    'จำนวนเงิน (บาท)': Number(p.amount),
    'รูปแบบการชำระ': p.payment_type === 'FULL' ? 'เต็มจำนวน (100%)' : p.payment_type === 'DEPOSIT' ? 'มัดจำ' : 'ผ่อนชำระ',
    'ช่องทางการชำระ': p.payment_method === 'PROMPTPAY_QR' ? 'PromptPay QR' : p.payment_method === 'BANK_TRANSFER' ? 'โอนเงินธนาคาร' : 'เงินสด (CASH)',
    'สถานะการชำระ': p.status === 'VERIFIED' ? 'อนุมัติแล้ว (VERIFIED)' : p.status === 'REJECTED' ? 'ปฏิเสธ (REJECTED)' : 'รอดำเนินการ (PENDING)',
    'ผู้ตรวจสอบ': p.verifier?.full_name || '-',
    'วันที่ตรวจสอบ': p.verified_at ? formatDateTime(p.verified_at) : '-',
    'วันที่แจ้งชำระ': formatDateTime(p.created_at),
  }));
  const paymentSheet = XLSX.utils.json_to_sheet(paymentRows.length > 0 ? paymentRows : [{ 'ผลลัพธ์': 'ไม่มีรายการชำระเงินในเดือนนี้' }]);
  XLSX.utils.book_append_sheet(workbook, paymentSheet, 'รายการชำระเงิน');

  // ----------------------------------------------------
  // Sheet 4: ใบเสร็จรับเงิน (Receipts)
  // ----------------------------------------------------
  const receiptRows = receipts.map((r, idx) => {
    const custom = r.customDetails;
    const custName = custom?.customer_name || r.booking?.customer?.full_name || '-';
    const custPhone = custom?.customer_phone || r.booking?.customer?.phone || '-';
    const custTaxId = custom?.customer_tax_id || r.booking?.customer?.id_card || '-';
    const bookNo = custom?.book_no || '1';
    const issuer = custom?.issuer_name || r.issuer?.full_name || 'สมบัติ รีสอร์ท';
    const itemsStr = Array.isArray(custom?.items) && custom.items.length > 0
      ? custom.items.map((it: any) => `${it.description} x${it.quantity} (${it.total}บ.)`).join(', ')
      : (r.receipt_items || []).map((it: any) => `${it.description} (${it.amount}บ.)`).join(', ') || '-';

    return {
      'ลำดับ': idx + 1,
      'เลขที่ใบเสร็จ': r.receipt_number,
      'เล่มที่': bookNo,
      'เลขที่การจอง': r.booking?.booking_number || 'Custom Manual',
      'ชื่อผู้เช่า / ลูกค้า': custName,
      'เบอร์โทรศัพท์': custPhone,
      'เลขผู้เสียภาษี / บัตรประชาชน': custTaxId,
      'รายการสินค้า/บริการ': itemsStr,
      'ยอดเงินรวมสุทธิ (บาท)': Number(r.amount),
      'ตัวหนังสือภาษาไทย': thaiBahtText(r.amount),
      'วันที่ออกใบเสร็จ': formatDateThaiLong(r.issued_at),
      'ผู้ออกใบเสร็จ / ผู้มีอำนาจลงนาม': issuer,
      'สถานะ': r.status === 'ISSUED' ? 'ออกใบเสร็จแล้ว (ISSUED)' : 'ยกเลิก (CANCELLED)',
    };
  });
  const receiptSheet = XLSX.utils.json_to_sheet(receiptRows.length > 0 ? receiptRows : [{ 'ผลลัพธ์': 'ไม่มีใบเสร็จรับเงินในเดือนนี้' }]);
  XLSX.utils.book_append_sheet(workbook, receiptSheet, 'ใบเสร็จรับเงิน');

  // ----------------------------------------------------
  // Sheet 5: สถิติรายห้องพัก (Room Statistics)
  // ----------------------------------------------------
  if (rooms && rooms.length > 0) {
    const roomStats = rooms.map((room, idx) => {
      let bookingCount = 0;
      let totalNights = 0;
      let totalRevenue = 0;

      bookings.forEach((b) => {
        const items = b.booking_items || [];
        const matching = items.filter((it) => it.room_id === room.id || it.room_number === room.room_number);
        if (matching.length > 0) {
          bookingCount += 1;
          matching.forEach((it) => {
            totalNights += Number(it.nights || 1);
            totalRevenue += Number(it.item_subtotal || 0);
          });
        }
      });

      return {
        'ลำดับ': idx + 1,
        'หมายเลขห้อง': room.room_number,
        'ชื่อห้องพัก': room.room_name,
        'ประเภทห้อง': room.room_type?.name || 'Standard',
        'ราคาต่อคืน (บาท)': Number(room.price_per_night),
        'จำนวนครั้งที่จอง (ครั้ง)': bookingCount,
        'จำนวนคืนที่เข้าพัก (คืน)': totalNights,
        'รายได้รวมของห้อง (บาท)': totalRevenue,
      };
    });

    const roomSheet = XLSX.utils.json_to_sheet(roomStats);
    XLSX.utils.book_append_sheet(workbook, roomSheet, 'สถิติรายห้องพัก');
  }

  // Write file
  XLSX.writeFile(workbook, filename);
}

// Quick Export functions
export function exportBookingsToExcel(bookings: Booking[], filename = 'bookings-report.xlsx') {
  const data = bookings.map((b, idx) => ({
    'ลำดับ': idx + 1,
    'เลขที่การจอง': b.booking_number,
    'ชื่อลูกค้า': b.customer?.full_name || '-',
    'เบอร์โทรศัพท์': b.customer?.phone || '-',
    'วันเช็คอิน': formatDateShort(b.check_in_date),
    'วันเช็คเอาท์': formatDateShort(b.check_out_date),
    'จำนวนคืน': b.total_nights,
    'จำนวนผู้เข้าพัก': b.num_guests,
    'ยอดรวม (บาท)': Number(b.subtotal_amount),
    'ส่วนลดโปรโมชั่น (บาท)': Number(b.promotion_discount),
    'ส่วนลดพิเศษ (บาท)': Number(b.manual_discount),
    'ยอดสุทธิ (บาท)': Number(b.net_total),
    'ชำระแล้ว (บาท)': Number(b.paid_amount),
    'คงเหลือ (บาท)': Number(b.remaining_balance),
    'สถานะ': b.status,
    'วันที่สร้าง': formatDateTime(b.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายการจอง');
  XLSX.writeFile(workbook, filename);
}

export function exportPaymentsToExcel(payments: Payment[], filename = 'payments-report.xlsx') {
  const data = payments.map((p: any, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสการชำระเงิน': p.id,
    'เลขที่การจอง': p.booking?.booking_number || p.booking_id || '-',
    'ชื่อลูกค้า': p.booking?.customer?.full_name || '-',
    'จำนวนเงิน (บาท)': Number(p.amount),
    'ประเภท': p.payment_type,
    'ช่องทาง': p.payment_method,
    'สถานะ': p.status,
    'ผู้ตรวจสอบ': p.verifier?.full_name || '-',
    'วันที่ชำระ': formatDateTime(p.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'การชำระเงิน');
  XLSX.writeFile(workbook, filename);
}

export function exportReceiptsToExcel(receipts: any[], filename = 'receipts-report.xlsx') {
  const data = receipts.map((r, idx) => {
    const custom = r.customDetails;
    return {
      'ลำดับ': idx + 1,
      'เลขที่ใบเสร็จ': r.receipt_number,
      'เล่มที่': custom?.book_no || '1',
      'เลขที่การจอง': r.booking?.booking_number || 'Manual',
      'ชื่อลูกค้า': custom?.customer_name || r.booking?.customer?.full_name || '-',
      'เบอร์โทร': custom?.customer_phone || r.booking?.customer?.phone || '-',
      'เลขผู้เสียภาษี': custom?.customer_tax_id || r.booking?.customer?.id_card || '-',
      'จำนวนเงิน (บาท)': Number(r.amount),
      'ตัวหนังสือ': thaiBahtText(r.amount),
      'วันที่ออก': formatDateThaiLong(r.issued_at),
      'ผู้ออก': custom?.issuer_name || r.issuer?.full_name || 'สมบัติ รีสอร์ท',
      'สถานะ': r.status,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ใบเสร็จรับเงิน');
  XLSX.writeFile(workbook, filename);
}

export function exportFinancialReportToExcel(
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalOutstanding: number;
    totalPromoDiscounts: number;
    totalManualDiscounts: number;
    totalBookings: number;
  },
  payments: Payment[],
  filename = 'financial-report.xlsx'
) {
  const summaryData = [
    { 'หัวข้อรายงาน': 'รายได้รวมสุทธิ (Net Total)', 'จำนวนเงิน (บาท)': summary.totalRevenue },
    { 'หัวข้อรายงาน': 'ยอดเงินที่ชำระแล้ว (Paid)', 'จำนวนเงิน (บาท)': summary.totalPaid },
    { 'หัวข้อรายงาน': 'ยอดคงเหลือค้างชำระ', 'จำนวนเงิน (บาท)': summary.totalOutstanding },
    { 'หัวข้อรายงาน': 'ส่วนลดโปรโมชั่นรวม', 'จำนวนเงิน (บาท)': summary.totalPromoDiscounts },
    { 'หัวข้อรายงาน': 'ส่วนลดพิเศษรวม', 'จำนวนเงิน (บาท)': summary.totalManualDiscounts },
    { 'หัวข้อรายงาน': 'จำนวนการจองทั้งหมด (รายการ)', 'จำนวนเงิน (บาท)': summary.totalBookings },
  ];

  const paymentData = payments.map((p: any, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสการชำระเงิน': p.id,
    'เลขที่การจอง': p.booking?.booking_number || p.booking_id,
    'จำนวนเงิน (บาท)': Number(p.amount),
    'ประเภท': p.payment_type,
    'ช่องทาง': p.payment_method,
    'สถานะ': p.status,
    'ผู้ตรวจสอบ': p.verifier?.full_name || '-',
    'วันที่ชำระ': formatDateTime(p.created_at),
  }));

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  const paymentSheet = XLSX.utils.json_to_sheet(paymentData);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุปรายงานการเงิน');
  XLSX.utils.book_append_sheet(workbook, paymentSheet, 'รายการชำระเงิน');
  XLSX.writeFile(workbook, filename);
}
