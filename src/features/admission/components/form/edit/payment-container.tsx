'use client';

import { useState } from 'react';
import {
  PaymentStep,
  PaymentOverview,
  PaymentInfoState,
  PAYMENT_INFO,
} from '@/features/admission/components/form/steps/payment';

type PaymentContainerProps = {
  existingPayment?: {
    discount: number;
    paymentType?: 'FULL_PAYMENT' | 'INSTALLMENTS' | null;
    secondInstallmentDate?: Date | string | null;
    paymentDueDate?: Date | string | null;
  } | null;
};

export const PaymentContainer = ({ existingPayment }: PaymentContainerProps) => {
  const [paymentCheckboxes, setPaymentCheckboxes] = useState<PaymentInfoState>(() => {
    // Initialize with existing payment data if available
    if (existingPayment) {
      return {
        discount: {
          label: 'Apply Discount',
          isChecked: existingPayment.discount > 0,
          value: existingPayment.discount > 0 ? existingPayment.discount.toString() : '',
        },
        installments: {
          label: 'Pay in Installments',
          isChecked: existingPayment.paymentType === 'INSTALLMENTS',
          date: existingPayment.secondInstallmentDate
            ? new Date(existingPayment.secondInstallmentDate)
            : null,
        },
      };
    }

    // Default state for new payments
    return PAYMENT_INFO;
  });

  return (
    <div className="grid grid-cols-12 gap-6">
      <PaymentStep
        paymentCheckboxes={paymentCheckboxes}
        setPaymentCheckboxes={setPaymentCheckboxes}
        existingPayment={existingPayment}
      />
      <div className="col-span-4">
        <PaymentOverview
          discountInfo={paymentCheckboxes.discount}
          paymentCheckboxes={paymentCheckboxes}
        />
      </div>

      {/* Show existing payment info if discount was applied */}
      {existingPayment && existingPayment.discount > 0 && (
        <div className="col-span-12 mt-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                Discount Applied: ₹{existingPayment.discount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              This discount has been applied to the original payment calculation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
