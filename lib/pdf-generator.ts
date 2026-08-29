import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, Receipt, Settings } from '@/types/database';
import { formatDateShort, formatDateTime } from './formatters';

// Clean unsupported characters/emojis using standard ES5 regex
function sanitizeForPdf(text?: string | null): string {
  if (!text) return '';
  return text.replace(/[^\w\s\u0E00-\u0E7F.,\-()/#]/g, '').trim();
}

export function generateBookingVoucherPdf(booking: Booking, settings: Settings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const primaryColor: [number, number, number] = [33, 82, 73]; // #215249 Resort Green
  const textColor: [number, number, number] = [40, 40, 40];
  const mutedColor: [number, number, number] = [120, 120, 120];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, 'F');

  // Resort Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const resortName = sanitizeForPdf(settings.resort_name_en) || sanitizeForPdf(settings.resort_name) || 'SOMBAT RESORT';
  doc.text(resortName, 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tel: ${sanitizeForPdf(settings.phone)} | Email: ${sanitizeForPdf(settings.email)}`, 14, 23);

  // Document Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING CONFIRMATION / VOUCHER', 14, 42);

  // Reference & Date Box
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Booking Ref: ${sanitizeForPdf(booking.booking_number)}`, 14, 48);
  doc.text(`Issued Date: ${formatDateTime(booking.created_at)}`, 14, 53);
  doc.text(`Status: ${sanitizeForPdf(booking.status)}`, 140, 48);

  // Customer & Stay Details in 2 columns
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 250, 250);
  doc.roundedRect(14, 58, 88, 38, 2, 2, 'FD');
  doc.roundedRect(108, 58, 88, 38, 2, 2, 'FD');

  // Column 1: Guest Information
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GUEST DETAILS', 18, 65);

  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const guestName = sanitizeForPdf(booking.customer?.full_name) || 'Guest';
  doc.text(`Name: ${guestName}`, 18, 72);
  doc.text(`Phone: ${sanitizeForPdf(booking.customer?.phone) || '-'}`, 18, 78);
  doc.text(`Email: ${sanitizeForPdf(booking.customer?.email) || '-'}`, 18, 84);
  doc.text(`Guests: ${booking.num_guests || 1} Person(s)`, 18, 90);

  // Column 2: Stay Information
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('STAY DETAILS', 112, 65);

  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Check-in: ${formatDateShort(booking.check_in_date)} (From ${settings.check_in_time ? settings.check_in_time.slice(0, 5) : '14:00'})`, 112, 72);
  doc.text(`Check-out: ${formatDateShort(booking.check_out_date)} (Before ${settings.check_out_time ? settings.check_out_time.slice(0, 5) : '12:00'})`, 112, 78);
  doc.text(`Duration: ${booking.total_nights} Night(s)`, 112, 84);

  // Table of Rooms
  const tableData = (booking.booking_items || []).map((item, idx) => [
    idx + 1,
    `${sanitizeForPdf(item.room_name)} (Room ${sanitizeForPdf(item.room_number)})`,
    `${Number(item.price_per_night).toLocaleString()} THB`,
    `${item.nights} Night(s)`,
    `${Number(item.item_subtotal).toLocaleString()} THB`,
  ]);

  autoTable(doc, {
    startY: 104,
    head: [['#', 'Room Description', 'Rate / Night', 'Nights', 'Amount']],
    body: tableData.length > 0 ? tableData : [[1, 'Room Reservation', '-', `${booking.total_nights}`, `${Number(booking.subtotal_amount).toLocaleString()} THB`]],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });

  // Financial Breakdown Box
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 140;

  const rightX = 120;
  let currY = finalY + 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', rightX, currY);
  doc.text(`${Number(booking.subtotal_amount).toLocaleString()} THB`, 196, currY, { align: 'right' });

  if (Number(booking.promotion_discount) > 0) {
    currY += 6;
    doc.setTextColor(200, 30, 30);
    doc.text('Promotion Discount:', rightX, currY);
    doc.text(`-${Number(booking.promotion_discount).toLocaleString()} THB`, 196, currY, { align: 'right' });
  }

  if (Number(booking.manual_discount) > 0) {
    currY += 6;
    doc.setTextColor(200, 30, 30);
    doc.text('Special Discount:', rightX, currY);
    doc.text(`-${Number(booking.manual_discount).toLocaleString()} THB`, 196, currY, { align: 'right' });
  }

  currY += 7;
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Net Total:', rightX, currY);
  doc.text(`${Number(booking.net_total).toLocaleString()} THB`, 196, currY, { align: 'right' });

  currY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 130, 50);
  doc.text('Paid Amount:', rightX, currY);
  doc.text(`${Number(booking.paid_amount).toLocaleString()} THB`, 196, currY, { align: 'right' });

  currY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 50, 0);
  doc.text('Remaining Balance:', rightX, currY);
  doc.text(`${Number(booking.remaining_balance).toLocaleString()} THB`, 196, currY, { align: 'right' });

  // Resort Policy Terms
  const policyY = Math.max(currY + 15, 230);
  doc.setDrawColor(220, 220, 220);
  doc.line(14, policyY - 5, 196, policyY - 5);

  doc.setTextColor(...primaryColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RESORT TERMS & POLICIES', 14, policyY);

  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Please present this confirmation voucher upon check-in.', 14, policyY + 5);

  return doc;
}

export function generateReceiptPdf(receipt: Receipt, settings: Settings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [33, 82, 73];
  const textColor: [number, number, number] = [40, 40, 40];
  const mutedColor: [number, number, number] = [120, 120, 120];

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, 'F');

  // Resort Info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const resortName = sanitizeForPdf(settings.resort_name_en) || sanitizeForPdf(settings.resort_name) || 'SOMBAT RESORT';
  doc.text(resortName, 14, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tel: ${sanitizeForPdf(settings.phone)}`, 14, 22);
  if (settings.tax_id) {
    doc.text(`Tax ID: ${sanitizeForPdf(settings.tax_id)}`, 14, 27);
  }

  // Document Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RECEIPT / PAYMENT RECEIPT', 14, 44);

  // Status Banner if cancelled
  if (receipt.status === 'CANCELLED') {
    doc.setTextColor(220, 20, 20);
    doc.setFontSize(14);
    doc.text('[ CANCELLED ]', 130, 44);
  }

  // Receipt Number & Date
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${sanitizeForPdf(receipt.receipt_number)}`, 14, 52);
  doc.text(`Date Issued: ${formatDateTime(receipt.issued_at)}`, 14, 58);
  doc.text(`Booking Ref: ${sanitizeForPdf(receipt.booking?.booking_number || receipt.booking_id)}`, 14, 64);

  // Customer Box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 250, 250);
  doc.roundedRect(14, 70, 182, 22, 2, 2, 'FD');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CUSTOMER', 18, 76);

  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  const customerName = sanitizeForPdf(receipt.booking?.customer?.full_name) || 'Guest';
  doc.text(`Name: ${customerName}`, 18, 83);
  doc.text(`Phone: ${sanitizeForPdf(receipt.booking?.customer?.phone) || '-'}`, 110, 83);

  // Payment Breakdown Table
  const tableData = [
    [
      '1',
      `Room Accommodation Payment (${sanitizeForPdf(receipt.payment?.payment_type) || 'PAYMENT'}) - Ref: ${sanitizeForPdf(receipt.booking?.booking_number)}`,
      sanitizeForPdf(receipt.payment?.payment_method) || 'BANK_TRANSFER',
      `${Number(receipt.amount).toLocaleString()} THB`,
    ],
  ];

  autoTable(doc, {
    startY: 98,
    head: [['#', 'Description', 'Payment Method', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 130;

  // Total Box
  doc.setFillColor(240, 245, 244);
  doc.roundedRect(110, finalY + 8, 86, 20, 2, 2, 'FD');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Paid:', 116, finalY + 21);
  doc.text(`${Number(receipt.amount).toLocaleString()} THB`, 190, finalY + 21, { align: 'right' });

  return doc;
}
