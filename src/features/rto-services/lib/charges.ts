import { RTOServiceType } from '../types';

// Government fees based on RTO service type
export const RTO_GOVERNMENT_FEES: Record<RTOServiceType, number> = {
  NEW_DRIVING_LICENCE: 716,
  ADDITION_OF_CLASS: 1016,
  LICENSE_RENEWAL: 416,
  DUPLICATE_LICENSE: 216,
  NAME_CHANGE: 200,
  ADDRESS_CHANGE: 200,
  INTERNATIONAL_PERMIT: 1000,
};

// Additional charges (smart card, courier, payment gateway)
export const RTO_ADDITIONAL_CHARGES: Record<RTOServiceType, { min: number; max: number }> = {
  NEW_DRIVING_LICENCE: { min: 234, max: 434 }, // Smart card (200-400) + courier/gateway (34)
  ADDITION_OF_CLASS: { min: 234, max: 434 },
  LICENSE_RENEWAL: { min: 234, max: 434 },
  DUPLICATE_LICENSE: { min: 234, max: 434 },
  NAME_CHANGE: { min: 230, max: 430 },
  ADDRESS_CHANGE: { min: 230, max: 430 },
  INTERNATIONAL_PERMIT: { min: 50, max: 100 }, // Processing/courier (30-50) + gateway (20-50)
};

export const getRTOServiceCharges = (serviceType: RTOServiceType) => {
  const governmentFees = RTO_GOVERNMENT_FEES[serviceType];
  const additionalCharges = RTO_ADDITIONAL_CHARGES[serviceType];
  return {
    governmentFees,
    additionalCharges,
  };
};
