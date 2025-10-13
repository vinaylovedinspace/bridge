import { Enrollment } from '@/server/db/plan';

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

export type EnrollmentPayment = NonNullable<Enrollment>['payment'] | null;
