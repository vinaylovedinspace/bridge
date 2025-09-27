import { pgEnum } from 'drizzle-orm/pg-core';

export const LicenseClassEnum = pgEnum('license_classes', [
  'MCWOG',
  'MCWG',
  'LMV',
  'ADAPTED_VEHICLE',
  'TRANSPORT_VEHICLE',
  'E_RICKSHAW',
  'E_CART',
  'OTHERS',
]);

export const ServiceTypeEnum = pgEnum('service_type', ['FULL_SERVICE', 'DRIVING_ONLY']);
