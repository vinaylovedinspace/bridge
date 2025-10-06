import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { useFormContext } from 'react-hook-form';

export const PaymentOptions = () => {
  const { control, setValue, watch } = useFormContext<RTOServiceFormValues>();

  const discount = watch('payment.discount');
  const applyDiscount = watch('payment.applyDiscount');

  // Derive checkbox state from form values
  const isDiscountChecked = applyDiscount || discount > 0;

  const handleDiscountCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setValue('payment.applyDiscount', true, { shouldDirty: true });
    } else {
      // When unchecking, reset both checkbox and discount value
      setValue('payment.applyDiscount', false, { shouldDirty: true });
      setValue('payment.discount', 0, { shouldDirty: true });
    }
  };

  return (
    <>
      <div className="flex gap-10 col-span-9">
        {/* Discount checkbox */}
        <FormItem className="flex items-center gap-3">
          <FormControl>
            <Checkbox checked={isDiscountChecked} onCheckedChange={handleDiscountCheckboxChange} />
          </FormControl>
          <FormLabel className="cursor-pointer">Apply Discount</FormLabel>
        </FormItem>
      </div>

      {isDiscountChecked && (
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
                      }}
                      className="h-12 pr-10"
                    />
                  </FormControl>
                  <FormMessage />
                  {field.value !== 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange(0);
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
    </>
  );
};
