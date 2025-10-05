import { useFormContext } from 'react-hook-form';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { formatCurrency } from '@/lib/payment/calculate';
import { PaymentInfoState } from './types';
import { getRTOServiceCharges } from '@/features/rto-services/lib/charges';

type PaymentOverviewProps = PaymentInfoState;

export const PaymentOverview = ({ discount: discountInfo }: PaymentOverviewProps) => {
  const { watch } = useFormContext<RTOServiceFormValues>();
  const serviceType = watch('service.type');

  const { governmentFees, additionalCharges } = getRTOServiceCharges(serviceType);

  const totalFees = governmentFees + additionalCharges.max;

  // Get discount value from props
  const discountValue = discountInfo.isChecked ? Number(discountInfo.value) || 0 : 0;

  // For RTO services, it's always FULL_PAYMENT (no installments)
  const finalAmount = totalFees - discountValue;
  const amountDue = finalAmount;

  // Format amounts
  const formattedGovernmentFees = formatCurrency(governmentFees);
  const formattedServiceCharge = formatCurrency(additionalCharges.max);
  const formattedDiscount = discountValue > 0 ? formatCurrency(discountValue) : null;
  const formattedAmountDue = formatCurrency(amountDue);

  return (
    <Card className="p-6 flex flex-col pt-10 min-h-[32rem] h-full">
      <div className="space-y-3">
        <TypographyLarge className="text-primary text-4xl text-center">
          {formattedAmountDue}
        </TypographyLarge>
        <div className="flex items-center justify-center space-x-2">
          <span className="bg-yellow-500 size-2 rounded-full inline-block" />
          <TypographyMuted className="text-center">Total Due</TypographyMuted>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col justify-between flex-grow h-full">
        <div className="space-y-2">
          <div className="flex justify-between">
            <TypographyMuted>Government Fees</TypographyMuted>
            <TypographyMuted className="font-semibold">{formattedGovernmentFees}</TypographyMuted>
          </div>

          <div className="flex justify-between">
            <TypographyMuted>Additional Charges</TypographyMuted>
            <TypographyMuted className="font-semibold">{formattedServiceCharge}</TypographyMuted>
          </div>
          <TypographyMuted className="text-xs">
            Includes smart card, courier & gateway charges
          </TypographyMuted>

          {formattedDiscount && (
            <div className="flex justify-between">
              <TypographyMuted>Discount</TypographyMuted>
              <TypographyMuted className="font-semibold text-green-600">
                -{formattedDiscount}
              </TypographyMuted>
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex justify-between">
            <TypographyMuted className="font-semibold">Total Due</TypographyMuted>
            <TypographyMuted className="font-semibold">{formattedAmountDue}</TypographyMuted>
          </div>
        </div>

        <div className="mt-auto pt-4 flex gap-2 items-center justify-center">
          <Info className="h-4 w-4 text-muted-foreground" />
          <TypographyMuted className="text-xs text-center">
            All amounts include GST and applicable taxes
          </TypographyMuted>
        </div>
      </div>
    </Card>
  );
};
