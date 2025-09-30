import { Dispatch, SetStateAction } from 'react';

// Define the payment info state type
export const PAYMENT_INFO = {
  discount: {
    label: 'Apply Discount',
    isChecked: false,
    value: '',
  },
  installments: {
    label: 'Pay in Installments',
    isChecked: false,
    date: null as Date | null,
  },
};

export type PaymentInfoState = typeof PAYMENT_INFO;

export type PaymentCheckboxProps = {
  paymentCheckboxes: PaymentInfoState;
  setPaymentCheckboxes: Dispatch<SetStateAction<PaymentInfoState>>;
  existingPayment?: {
    discount: number;
    paymentType?: 'FULL_PAYMENT' | 'INSTALLMENTS' | null;
    secondInstallmentDate?: Date | string | null;
    paymentDueDate?: Date | string | null;
  } | null;
};

export type PaymentOverviewProps = {
  discountInfo: { isChecked: boolean; value: string };
  paymentCheckboxes: PaymentInfoState;
};
