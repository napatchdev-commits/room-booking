import { UserRole } from '@/types/database';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: [
    'booking.view',
    'booking.create',
    'booking.edit',
    'booking.cancel',
    'payment.view',
    'payment.verify',
    'receipt.view',
    'receipt.create',
    'receipt.cancel',
    'report.view',
    'promotion.manage',
    'discount.manage',
    'room.manage',
    'user.manage',
    'settings.manage',
  ],
  ADMIN: [
    'booking.view',
    'booking.create',
    'booking.edit',
    'booking.cancel',
    'payment.view',
    'payment.verify',
    'receipt.view',
    'receipt.create',
    'receipt.cancel',
    'report.view',
    'promotion.manage',
    'discount.manage',
    'room.manage',
    'user.manage',
    'settings.manage',
  ],
  STAFF: [
    'booking.view',
    'booking.create',
    'booking.edit',
    'payment.view',
    'payment.verify',
    'receipt.view',
    'receipt.create',
    'room.manage',
    'report.view',
  ],
  CUSTOMER: [
    'booking.view',
    'booking.create',
  ],
};

export function checkRolePermission(role: UserRole | string | undefined | null, permissionCode: string): boolean {
  if (!role) return false;
  if (role === 'OWNER') return true;
  const permissions = ROLE_PERMISSIONS[role as UserRole] || [];
  return permissions.includes(permissionCode);
}
