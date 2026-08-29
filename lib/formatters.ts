import { format, parseISO, differenceInDays } from 'date-fns';

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
  return new Intl.NumberFormat('th-TH').format(num);
}

export function formatDateThai(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    const monthsThai = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const day = date.getDate();
    const month = monthsThai[date.getMonth()];
    const yearThai = date.getFullYear() + 543;
    return `${day} ${month} ${yearThai}`;
  } catch {
    return String(dateStr);
  }
}

export function formatDateShort(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'dd/MM/yyyy');
  } catch {
    return String(dateStr);
  }
}

export function formatDateTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch {
    return String(dateStr);
  }
}

export function calculateNights(checkInStr: string, checkOutStr: string): number {
  if (!checkInStr || !checkOutStr) return 0;
  try {
    const checkIn = parseISO(checkInStr);
    const checkOut = parseISO(checkOutStr);
    const nights = differenceInDays(checkOut, checkIn);
    return nights > 0 ? nights : 0;
  } catch {
    return 0;
  }
}

export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }
  return phone;
}

export function formatDateThaiLong(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    const monthsThai = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const day = date.getDate();
    const month = monthsThai[date.getMonth()];
    const yearThai = date.getFullYear() + 543;
    return `${day} ${month} ${yearThai}`;
  } catch {
    return String(dateStr);
  }
}

export function thaiBahtText(num: number | string | undefined | null): string {
  if (num === undefined || num === null || isNaN(Number(num))) return 'ศูนย์บาทถ้วน';
  const n = Number(num);
  if (n === 0) return 'ศูนย์บาทถ้วน';

  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const convertGroup = (valStr: string) => {
    let res = '';
    const len = valStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(valStr[i], 10);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos === 0 && digit === 1 && len > 1 && parseInt(valStr[len - 2], 10) !== 0) {
          res += 'เอ็ด';
        } else if (pos === 1 && digit === 1) {
          res += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          res += 'ยี่สิบ';
        } else {
          res += numbers[digit] + (pos === 1 ? 'สิบ' : units[pos]);
        }
      }
    }
    return res;
  };

  const parts = n.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let result = '';
  if (parseInt(integerPart, 10) > 0) {
    result += convertGroup(integerPart) + 'บาท';
  }

  if (parseInt(decimalPart, 10) > 0) {
    result += convertGroup(decimalPart) + 'สตางค์';
  } else {
    result += 'ถ้วน';
  }

  return result;
}

