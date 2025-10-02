import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { PaymentCheckboxProps } from './types';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { useFormContext } from 'react-hook-form';
import { useEffect } from 'react';

export const PaymentOptions = ({
  paymentCheckboxes,
  setPaymentCheckboxes,
  existingPayment,
}: PaymentCheckboxProps) => {
  const { control, setValue } = useFormContext<AdmissionFormValues>();

  const hasExistingDiscount = Boolean(existingPayment && existingPayment.discount > 0);
  const hasExistingInstallments = Boolean(
    existingPayment &&
      existingPayment.paymentType === 'INSTALLMENTS' &&
      existingPayment.installmentPayments &&
      existingPayment.installmentPayments.length > 0
  );

  // Update form value when payment checkboxes change
  useEffect(() => {
    if (paymentCheckboxes.installments.isChecked) {
      setValue('payment.paymentType', 'INSTALLMENTS');
    } else {
      setValue('payment.paymentType', 'FULL_PAYMENT');
    }
  }, [paymentCheckboxes.installments.isChecked, setValue]);

  const handleCheckboxChange = (
    info: keyof typeof paymentCheckboxes,
    checked: boolean | 'indeterminate'
  ) => {
    setPaymentCheckboxes((prev) => {
      if (info === 'installments' && checked === true) {
        return {
          ...prev,
          installments: { ...prev.installments, isChecked: true },
        };
      }

      // For other checkboxes or unchecking
      return {
        ...prev,
        [info]: {
          ...prev[info],
          isChecked: checked === true,
        },
      };
    });
  };

  const handleDiscountChange = (value: string) => {
    setPaymentCheckboxes((prev) => ({
      ...prev,
      discount: {
        ...prev.discount,
        value,
      },
    }));
  };

  const clearDiscount = () => {
    setPaymentCheckboxes((prev) => ({
      ...prev,
      discount: {
        ...prev.discount,
        value: '',
      },
    }));
  };

  return (
    <>
      <div className="flex gap-10 col-span-9">
        {/* Discount checkbox */}
        <FormItem className="flex items-center gap-3">
          <FormControl>
            <Checkbox
              checked={paymentCheckboxes.discount.isChecked}
              onCheckedChange={(checked) => handleCheckboxChange('discount', checked)}
              disabled={hasExistingDiscount}
            />
          </FormControl>
          <FormLabel
            className={hasExistingDiscount ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          >
            {paymentCheckboxes.discount.label}
          </FormLabel>
        </FormItem>

        {/* Installments checkbox */}
        <FormItem className="flex items-center gap-3">
          <FormControl>
            <Checkbox
              checked={paymentCheckboxes.installments.isChecked}
              onCheckedChange={(checked) => handleCheckboxChange('installments', checked)}
              disabled={hasExistingInstallments}
            />
          </FormControl>
          <FormLabel
            className={hasExistingInstallments ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          >
            {paymentCheckboxes.installments.label}
          </FormLabel>
        </FormItem>
      </div>

      {paymentCheckboxes.discount.isChecked && (
        <div className="col-span-5 col-start-4 pt-5">
          <FormField
            control={control}
            name="payment.discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Amount</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      placeholder="Enter discount amount"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value;
                        const numValue = value === '' ? 0 : Number(value);
                        field.onChange(isNaN(numValue) ? 0 : numValue);
                        handleDiscountChange(e.target.value);
                      }}
                      className="h-12 pr-10" // Added right padding for the X icon
                      disabled={hasExistingDiscount}
                    />
                  </FormControl>
                  <FormMessage />
                  {field.value !== 0 && !hasExistingDiscount && (
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange(0);
                        clearDiscount();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label="Clear discount"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </FormItem>
            )}
          />
        </div>
      )}

      {/* TODO: Implement installment date selection with new schema */}
    </>
  );
};
