// Define the payment info state type
export const PAYMENT_INFO = {
  discount: {
    label: 'Apply Discount',
    isChecked: false,
    value: '',
  },
};

export type PaymentInfoState = typeof PAYMENT_INFO;
