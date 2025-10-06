import { TypographyLarge, TypographyMuted } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { Enrollment } from '@/server/db/plan';
import { usePaymentCalculations } from '@/features/enrollment/hooks/use-payment-calculations';

type PaymentOverviewProps = {
  existingPayment: NonNullable<Enrollment>['payment'];
  isEditMode?: boolean;
};

export const PaymentOverview = ({ existingPayment, isEditMode = false }: PaymentOverviewProps) => {
  const {
    formatted,
    firstInstallmentPayment,
    secondInstallmentPayment,
    isFirstInstallmentPaid,
    isSecondInstallmentPaid,
    paymentType,
    licenseFeeBreakdown,
  } = usePaymentCalculations({ existingPayment, isEditMode });

  return (
    <Card className="p-6 flex flex-col pt-10 min-h-[32rem] h-full">
      <div className="space-y-3">
        <TypographyLarge className="text-primary text-4xl text-center">
          {formatted.amountDue}
        </TypographyLarge>
        <div className="flex items-center justify-center space-x-2">
          <span
            className={`${isFirstInstallmentPaid ? 'bg-orange-500' : 'bg-yellow-500'} size-2 rounded-full inline-block`}
          />
          <TypographyMuted className="text-center">
            {isFirstInstallmentPaid ? 'Remaining Due' : 'Total Due'}
          </TypographyMuted>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col justify-between flex-grow h-full">
        <div>
          <div className="flex justify-between">
            <TypographyMuted>Training Fee</TypographyMuted>
            <TypographyMuted className="font-semibold">{formatted.trainingFees}</TypographyMuted>
          </div>

          {formatted.licenseServiceFee && licenseFeeBreakdown && (
            <div>
              <div className="flex justify-between mt-2 cursor-help">
                <TypographyMuted>License Service Fee</TypographyMuted>
                <TypographyMuted className="font-semibold">
                  {formatted.licenseServiceFee}
                </TypographyMuted>
              </div>
              <div className="flex justify-end">
                <TypographyMuted className="text-xs pt-1 ">
                  Govt: ₹{licenseFeeBreakdown.governmentFees} + Service: ₹
                  {licenseFeeBreakdown.serviceCharge}
                </TypographyMuted>
              </div>
            </div>
          )}

          {formatted.discount && (
            <>
              <div className="flex justify-between mt-2">
                <TypographyMuted>Discount</TypographyMuted>
                <TypographyMuted className="font-semibold text-green-600">
                  -{formatted.discount}
                </TypographyMuted>
              </div>
            </>
          )}

          {paymentType === 'INSTALLMENTS' && (
            <>
              <div className="flex justify-between mt-4">
                <TypographyMuted className="flex items-center gap-2">
                  1st Installment
                  {isFirstInstallmentPaid && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Received via {firstInstallmentPayment?.paymentMode}
                    </span>
                  )}
                </TypographyMuted>
                <TypographyMuted
                  className={`font-semibold ${isFirstInstallmentPaid ? 'text-green-600' : ''}`}
                >
                  {formatted.firstInstallment}
                </TypographyMuted>
              </div>
              <div className="flex justify-between mt-2">
                <TypographyMuted className="flex items-center gap-2">
                  2nd Installment
                  {isSecondInstallmentPaid && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Received via {secondInstallmentPayment?.paymentMode}
                    </span>
                  )}
                </TypographyMuted>
                <TypographyMuted className="font-semibold">
                  {formatted.secondInstallment}
                </TypographyMuted>
              </div>
            </>
          )}

          {paymentType === 'FULL_PAYMENT' && (
            <>
              <Separator className="my-6" />
              <div className="flex justify-between">
                <TypographyMuted>
                  {isFirstInstallmentPaid ? 'Remaining Due' : 'Total Due'}
                </TypographyMuted>
                <TypographyMuted className="font-semibold">{formatted.amountDue}</TypographyMuted>
              </div>
            </>
          )}
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
