import * as XLSX from 'xlsx';
import { Booking, Payment, Receipt } from '@/types/database';
import { formatDateShort, formatDateTime } from './formatters';

export function exportBookingsToExcel(bookings: Booking[], filename = 'bookings-report.xlsx') {
  const data = bookings.map((b) => ({
    'Booking Ref': b.booking_number,
    'Guest Name': b.customer?.full_name || '-',
    'Phone': b.customer?.phone || '-',
    'Check-in': formatDateShort(b.check_in_date),
    'Check-out': formatDateShort(b.check_out_date),
    'Nights': b.total_nights,
    'Guests': b.num_guests,
    'Subtotal (THB)': Number(b.subtotal_amount),
    'Promotion Discount (THB)': Number(b.promotion_discount),
    'Manual Discount (THB)': Number(b.manual_discount),
    'Net Total (THB)': Number(b.net_total),
    'Paid Amount (THB)': Number(b.paid_amount),
    'Remaining Balance (THB)': Number(b.remaining_balance),
    'Status': b.status,
    'Created At': formatDateTime(b.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
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
    { 'Metric': 'Total Revenue (Net Total)', 'Amount (THB)': summary.totalRevenue },
    { 'Metric': 'Total Received (Paid)', 'Amount (THB)': summary.totalPaid },
    { 'Metric': 'Total Outstanding Balance', 'Amount (THB)': summary.totalOutstanding },
    { 'Metric': 'Total Promotion Discounts Given', 'Amount (THB)': summary.totalPromoDiscounts },
    { 'Metric': 'Total Manual Discounts Given', 'Amount (THB)': summary.totalManualDiscounts },
    { 'Metric': 'Total Bookings Count', 'Amount (THB)': summary.totalBookings },
  ];

  const paymentData = payments.map((p) => ({
    'Payment ID': p.id,
    'Booking Ref': (p as unknown as { booking?: { booking_number?: string } }).booking?.booking_number || p.booking_id,
    'Amount (THB)': Number(p.amount),
    'Payment Type': p.payment_type,
    'Payment Method': p.payment_method,
    'Status': p.status,
    'Verified By': p.verifier?.full_name || '-',
    'Created At': formatDateTime(p.created_at),
  }));

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  const paymentSheet = XLSX.utils.json_to_sheet(paymentData);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Financial Summary');
  XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payments');
  XLSX.writeFile(workbook, filename);
}
