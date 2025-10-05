import { clsx, type ClassValue } from 'clsx';
import { Path } from 'react-hook-form';
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
export const formatDateToDDMMYYYY = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const generateFieldPaths = <T>({
  prefix,
  excludeFields = [],
  getValues,
}: {
  prefix: keyof T;
  excludeFields?: string[];
  getValues: (key: string) => unknown;
}): Path<T>[] => {
  // Get the value for the specified prefix and safely handle undefined
  const value = getValues(prefix as string);
  const fields = value ? Object.keys(value) : [];

  return fields
    .filter((field) => !excludeFields.includes(field))
    .map((field) => `${String(prefix)}.${field}` as Path<T>);
};
