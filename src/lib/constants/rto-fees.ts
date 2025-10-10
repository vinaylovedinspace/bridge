/**
 * Maharashtra RTO License Fees Constants
 * Last Updated: December 2024
 * Source: Maharashtra Transport Department & Parivahan Portal
 *
 * Update these values when Maharashtra government revises RTO fees
 */

import { LicenseClass } from './license-classes';

export const MAHARASHTRA_RTO_FEES = {
  // Learning License - Per Class
  LEARNING_LICENSE_PER_CLASS: 201,

  // Driving License (Permanent) - Per Class
  DRIVING_LICENSE_PER_CLASS: 716,
} as const;

/**
 * RTO Service Types - Government fees and additional charges
 * Consolidated from various RTO services
 */
export const RTO_SERVICE_CHARGES = {
  NEW_DRIVING_LICENCE: {
    governmentFees: 716,
    additionalCharges: { min: 234, max: 434 }, // Smart card (200-400) + courier/gateway (34)
  },
  ADDITION_OF_CLASS: {
    governmentFees: 1016,
    additionalCharges: { min: 234, max: 434 },
  },
  LICENSE_RENEWAL: {
    governmentFees: 416,
    additionalCharges: { min: 234, max: 434 },
  },
  DUPLICATE_LICENSE: {
    governmentFees: 216,
    additionalCharges: { min: 234, max: 434 },
  },
  NAME_CHANGE: {
    governmentFees: 200,
    additionalCharges: { min: 230, max: 430 },
  },
  ADDRESS_CHANGE: {
    governmentFees: 200,
    additionalCharges: { min: 230, max: 430 },
  },
  INTERNATIONAL_PERMIT: {
    governmentFees: 1000,
    additionalCharges: { min: 50, max: 100 }, // Processing/courier (30-50) + gateway (20-50)
  },
} as const;

export type RTOServiceType = keyof typeof RTO_SERVICE_CHARGES;

/**
 * Get RTO service charges for a specific service type
 * @param serviceType - The type of RTO service
 * @returns Government fees and additional charges (defaults to max)
 * @throws Error if service type is invalid
 *
 * @example
 * // Uses max additional charges by default
 * getRTOServiceCharges('NEW_DRIVING_LICENCE')
 * // Returns: { governmentFees: 716, additionalCharges: 434 }
 */
export const getRTOServiceCharges = (serviceType: RTOServiceType) => {
  const charges = RTO_SERVICE_CHARGES[serviceType];

  return {
    governmentFees: charges.governmentFees,
    additionalCharges: charges.additionalCharges.max,
    additionalChargesRange: charges.additionalCharges,
  };
};

export const calculateLicenseFees = ({
  licenseClasses,
  excludeLearningLicenseFee,
  serviceCharge: _serviceCharge,
}: {
  licenseClasses: LicenseClass[] | null;
  excludeLearningLicenseFee: boolean;
  serviceCharge: number;
}) => {
  if (!licenseClasses || licenseClasses.length === 0) {
    return {
      governmentFees: 0,
      total: 0,
      breakdown: {
        llFees: 0,
        dlFees: 0,
        description: 'No license classes selected',
      },
      llFees: 0,
      dlFees: 0,
    };
  }

  const classCount = licenseClasses.length;
  let llFees = 0;
  let dlFees = 0;

  if (excludeLearningLicenseFee) {
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
  let description = '';
  if (excludeLearningLicenseFee) {
    description = `DL Fees: ₹${dlFees} (₹${MAHARASHTRA_RTO_FEES.DRIVING_LICENSE_PER_CLASS} × ${classCount})`;
  } else {
    description = `LL Fees: ₹${llFees} (₹${MAHARASHTRA_RTO_FEES.LEARNING_LICENSE_PER_CLASS} × ${classCount}), DL Fees: ₹${dlFees} (₹${MAHARASHTRA_RTO_FEES.DRIVING_LICENSE_PER_CLASS} × ${classCount})`;
  }

  const serviceCharge = Math.max(_serviceCharge, 0);

  return {
    governmentFees,
    serviceCharge,
    total: governmentFees + serviceCharge,
    breakdown: {
      llFees,
      dlFees,
      description,
    },
  };
};
