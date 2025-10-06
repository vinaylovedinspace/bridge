import { LicenseClassEnum } from '@/db/schema/enums';

// Extract the enum values from the pgEnum definition
export type LicenseClass = (typeof LicenseClassEnum.enumValues)[number];

// License class labels mapped to their enum values
export const LICENSE_CLASS_LABELS: Record<LicenseClass, string> = {
  LMV: 'LMV (Light Motor Vehicle)',
  MCWOG: 'MCWOG (Motor Cycle Without Gear)',
  MCWG: 'MCWG (Motor Cycle With Gear)',
  ADAPTED_VEHICLE: 'Adapted Vehicle (for use by Divyang)',
  TRANSPORT_VEHICLE: 'Medium/Heavy Goods or Passenger Vehicle (Transport)',
  E_RICKSHAW: 'E-Rickshaw',
  E_CART: 'E-Cart',
  OTHERS: 'Others (Harvester, Excavator, Fork lift, etc.)',
};

// License class options for form components
export const LICENSE_CLASS_OPTIONS = Object.entries(LICENSE_CLASS_LABELS).map(([value, label]) => ({
  value: value as LicenseClass,
  label,
}));
