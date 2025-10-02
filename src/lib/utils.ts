import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTenantNameInitials(tenantName: string) {
  return tenantName
    .split(' ')
    .map((word) => word[0])
    .join('');
}
