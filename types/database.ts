export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type RoomStatus = 'available' | 'booked' | 'occupied' | 'maintenance';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';

export type PaymentType = 'FULL' | 'DEPOSIT' | 'INSTALLMENT' | 'REMAINING';

export type PaymentMethod = 'PROMPTPAY_QR' | 'BANK_TRANSFER' | 'CASH' | 'CREDIT_CARD';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type ReceiptStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type DiscountCategory = 'PROMOTION' | 'MANUAL';

export interface BankAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
  promptpay_id?: string;
  promptpay_qr_url?: string;
}

export interface Settings {
  id: string;
  resort_name: string;
  resort_name_en: string;
  address: string;
  phone: string;
  email: string;
  line_id?: string;
  line_liff_id?: string;
  logo_url?: string;
  tax_id?: string;
  bank_accounts: BankAccount[];
  check_in_time: string;
  check_out_time: string;
  policy_terms?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id?: string;
  email?: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  code: string;
  name: string;
  description?: string;
  module: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  id_card?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LineUser {
  line_user_id: string;
  customer_id: string;
  display_name: string;
  picture_url?: string;
  status_message?: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface RoomType {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  base_capacity: number;
  max_capacity: number;
  base_price: number;
  amenities: string[];
  cover_image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomImage {
  id: string;
  room_id: string;
  image_url: string;
  display_order: number;
  caption?: string;
  created_at: string;
}

export interface Room {
  id: string;
  room_number: string;
  room_name: string;
  room_type_id: string;
  price_per_night: number;
  capacity: number;
  details?: string;
  amenities: string[];
  status: RoomStatus;
  created_at: string;
  updated_at: string;
  room_type?: RoomType;
  room_images?: RoomImage[];
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_nights: number;
  applicable_room_type_id?: string;
  applicable_days_of_week?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  room_type?: RoomType;
}

export interface BookingItem {
  id: string;
  booking_id: string;
  room_id: string;
  room_name: string;
  room_number: string;
  price_per_night: number;
  nights: number;
  item_subtotal: number;
  created_at: string;
  room?: Room;
}

export interface BookingDiscount {
  id: string;
  booking_id: string;
  type: DiscountCategory;
  promotion_id?: string;
  discount_type: DiscountType;
  discount_value: number;
  applied_amount: number;
  reason?: string;
  authorized_by?: string;
  created_at: string;
  authorizer?: Profile;
  promotion?: Promotion;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  slip_url?: string;
  slip_uploaded_at?: string;
  status: PaymentStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  verifier?: Profile;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  booking_id: string;
  payment_id: string;
  amount: number;
  status: ReceiptStatus;
  issued_at: string;
  issued_by: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancel_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  issuer?: Profile;
  canceller?: Profile;
  payment?: Payment;
  receipt_items?: ReceiptItem[];
  booking?: Booking;
}

export interface Booking {
  id: string;
  booking_number: string;
  customer_id: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  num_guests: number;
  subtotal_amount: number;
  promotion_discount: number;
  manual_discount: number;
  net_total: number;
  paid_amount: number;
  remaining_balance: number;
  status: BookingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  booking_items?: BookingItem[];
  booking_discounts?: BookingDiscount[];
  payments?: Payment[];
  receipts?: Receipt[];
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_name?: string;
  action: string;
  entity: string;
  entity_id: string;
  details_before?: Record<string, unknown>;
  details_after?: Record<string, unknown>;
  created_at: string;
}
