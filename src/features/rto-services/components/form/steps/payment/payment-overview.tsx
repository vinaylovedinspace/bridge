import { TypographyLarge, TypographyMuted } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { useRTOPaymentCalculations } from '@/features/rto-services/hooks/use-rto-payment-calculations';

export const PaymentOverview = () => {
  const { formatted } = useRTOPaymentCalculations();

  return (
    <Card className="p-6 flex flex-col pt-10 min-h-[32rem] h-full">
      <div className="space-y-3">
        <TypographyLarge className="text-primary text-4xl text-center">
          {formatted.amountDue}
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
            <TypographyMuted className="font-semibold">{formatted.governmentFees}</TypographyMuted>
          </div>

          <div className="flex justify-between">
            <TypographyMuted>Additional Charges</TypographyMuted>
            <TypographyMuted className="font-semibold">{formatted.serviceCharge}</TypographyMuted>
          </div>
          <TypographyMuted className="text-xs">
            Includes smart card, courier & gateway charges
          </TypographyMuted>

          {formatted.discount && (
            <div className="flex justify-between">
              <TypographyMuted>Discount</TypographyMuted>
              <TypographyMuted className="font-semibold text-green-600">
                -{formatted.discount}
              </TypographyMuted>
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex justify-between">
            <TypographyMuted className="font-semibold">Total Due</TypographyMuted>
            <TypographyMuted className="font-semibold">{formatted.amountDue}</TypographyMuted>
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
