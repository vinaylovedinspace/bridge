/**
 * Maharashtra RTO License Fees Constants
 * Last Updated: December 2024
 * Source: Maharashtra Transport Department & Parivahan Portal
 *
 * Update these values when Maharashtra government revises RTO fees
 */

export const MAHARASHTRA_RTO_FEES = {
  // Learning License - Per Class
  LEARNING_LICENSE_PER_CLASS: 201,

  // Driving License (Permanent) - Per Class
  DRIVING_LICENSE_PER_CLASS: 716,
} as const;

/**
 * Calculate license fees based on scenario with per-class pricing
 */
export const calculateLicenseFees = (
  licenseClasses: string[] = [],
  hasExistingLearners: boolean = false,
  serviceCharge: number = 0
): { governmentFees: number; total: number; breakdown: string; llFees: number; dlFees: number } => {
  if (licenseClasses.length === 0) {
    return {
      governmentFees: 0,
      total: serviceCharge,
      breakdown: 'No license classes selected',
      llFees: 0,
      dlFees: 0,
    };
  }

  const classCount = licenseClasses.length;
  let llFees = 0;
  let dlFees = 0;

  if (hasExistingLearners) {
    // Student already has learners license - only driving license needed
    llFees = 0;
    dlFees = MAHARASHTRA_RTO_FEES.DRIVING_LICENSE_PER_CLASS * classCount;
  } else {
    // New student - needs both learners and driving license
    llFees = MAHARASHTRA_RTO_FEES.LEARNING_LICENSE_PER_CLASS * classCount;
    dlFees = MAHARASHTRA_RTO_FEES.DRIVING_LICENSE_PER_CLASS * classCount;
  }

  const governmentFees = llFees + dlFees;

  // Create detailed breakdown
  let breakdown = '';
  if (hasExistingLearners) {
    breakdown = `DL Fees: ₹${dlFees} (₹${MAHARASHTRA_RTO_FEES.DRIVING_LICENSE_PER_CLASS} × ${classCount})`;
  } else {
    breakdown = `LL Fees: ₹${llFees} (₹${MAHARASHTRA_RTO_FEES.LEARNING_LICENSE_PER_CLASS} × ${classCount}), DL Fees: ₹${dlFees} (₹${MAHARASHTRA_RTO_FEES.DRIVING_LICENSE_PER_CLASS} × ${classCount})`;
  }

  return {
    governmentFees,
    total: governmentFees + serviceCharge,
    breakdown,
    llFees,
    dlFees,
  };
};

/**
 * RTO Services Fee Structure
 * These are the government fees + typical service charges for various RTO services
 */
export const RTO_SERVICE_FEES = {
  LICENSE_RENEWAL: {
    governmentFees: 200,
    serviceCharge: 800,
    urgentFees: 300,
    description: 'Driving Licence Renewal',
  },
  ADDRESS_CHANGE: {
    governmentFees: 100,
    serviceCharge: 500,
    urgentFees: 200,
    description: 'Address Change on Licence',
  },
  DUPLICATE_LICENSE: {
    governmentFees: 200,
    serviceCharge: 600,
    urgentFees: 300,
    description: 'Duplicate Licence Issuance',
  },
  INTERNATIONAL_PERMIT: {
    governmentFees: 1000,
    serviceCharge: 1500,
    urgentFees: 500,
    description: 'International Driving Permit',
  },
  NEW_LICENSE: {
    governmentFees: 650, // Learning + Driving
    serviceCharge: 1200,
    urgentFees: 400,
    description: 'New Driving Licence (Learning + Permanent)',
  },
  LEARNER_LICENSE: {
    governmentFees: 200,
    serviceCharge: 600,
    urgentFees: 200,
    description: 'Learner Licence Only',
  },
  CATEGORY_ADDITION: {
    governmentFees: 1016,
    serviceCharge: 1000,
    urgentFees: 400,
    description: 'Add New Vehicle Category',
  },
  LICENSE_TRANSFER: {
    governmentFees: 200,
    serviceCharge: 800,
    urgentFees: 300,
    description: 'Transfer Licence to Another State',
  },
  NAME_CHANGE: {
    governmentFees: 100,
    serviceCharge: 500,
    urgentFees: 200,
    description: 'Name Change on Licence',
  },
  ENDORSEMENT_REMOVAL: {
    governmentFees: 200,
    serviceCharge: 600,
    urgentFees: 250,
    description: 'Remove Endorsement from Licence',
  },
} as const;

/**
 * Get fee structure for a specific RTO service type
 */
export const getRTOServiceFees = (serviceType: keyof typeof RTO_SERVICE_FEES) => {
  const fees = RTO_SERVICE_FEES[serviceType];
  return {
    ...fees,
    totalAmount: fees.governmentFees + fees.serviceCharge,
    totalWithUrgent: fees.governmentFees + fees.serviceCharge + fees.urgentFees,
  };
};

/**
 * Calculate RTO service fees with priority
 */
export const calculateRTOServiceFees = (
  serviceType: keyof typeof RTO_SERVICE_FEES,
  priority: 'NORMAL' | 'TATKAL' = 'NORMAL',
  customServiceCharge?: number
) => {
  const baseFees = RTO_SERVICE_FEES[serviceType];
  const serviceCharge = customServiceCharge ?? baseFees.serviceCharge;
  const urgentFees = priority === 'NORMAL' ? 0 : baseFees.urgentFees;

  return {
    governmentFees: baseFees.governmentFees,
    serviceCharge,
    urgentFees,
    totalAmount: baseFees.governmentFees + serviceCharge + urgentFees,
    description: baseFees.description,
  };
};
