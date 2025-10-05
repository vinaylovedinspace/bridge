import { useFormContext } from 'react-hook-form';
import { RTOServiceFormValues, RTOServiceType } from '@/features/rto-services/types';
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { formatCurrency } from '@/lib/payment/calculate';
import { PaymentInfoState } from './types';

// Government fees based on RTO service type
const RTO_GOVERNMENT_FEES: Record<RTOServiceType, number> = {
  NEW_DRIVING_LICENCE: 716,
  ADDITION_OF_CLASS: 1016,
  LICENSE_RENEWAL: 416,
  DUPLICATE_LICENSE: 216,
  NAME_CHANGE: 200,
  ADDRESS_CHANGE: 200,
  INTERNATIONAL_PERMIT: 1000,
};

// Additional charges (smart card, courier, payment gateway)
const RTO_ADDITIONAL_CHARGES: Record<RTOServiceType, { min: number; max: number }> = {
  NEW_DRIVING_LICENCE: { min: 234, max: 434 }, // Smart card (200-400) + courier/gateway (34)
  ADDITION_OF_CLASS: { min: 234, max: 434 },
  LICENSE_RENEWAL: { min: 234, max: 434 },
  DUPLICATE_LICENSE: { min: 234, max: 434 },
  NAME_CHANGE: { min: 230, max: 430 },
  ADDRESS_CHANGE: { min: 230, max: 430 },
  INTERNATIONAL_PERMIT: { min: 50, max: 100 }, // Processing/courier (30-50) + gateway (20-50)
};

type PaymentOverviewProps = PaymentInfoState;

export const PaymentOverview = ({ discount: discountInfo }: PaymentOverviewProps) => {
  const { watch } = useFormContext<RTOServiceFormValues>();
  const serviceType = watch('service.type');

  // Get fees based on service type
  const governmentFees = serviceType ? RTO_GOVERNMENT_FEES[serviceType] : 0;
  const additionalCharges = serviceType ? RTO_ADDITIONAL_CHARGES[serviceType].max : 0;
  const serviceCharge = additionalCharges;

  const totalFees = governmentFees + serviceCharge;

  // Get discount value from props
  const discountValue = discountInfo.isChecked ? Number(discountInfo.value) || 0 : 0;

  // For RTO services, it's always FULL_PAYMENT (no installments)
  const finalAmount = totalFees - discountValue;
  const amountDue = finalAmount;

  // Format amounts
  const formattedGovernmentFees = formatCurrency(governmentFees);
  const formattedServiceCharge = formatCurrency(serviceCharge);
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
