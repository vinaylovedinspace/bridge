import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { useVehicle } from '@/hooks/vehicles';
import { TypographyLarge, TypographyMuted } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { PaymentOverviewProps } from './types';
import { calculatePaymentAmounts, formatCurrency } from '@/lib/payment/calculate';

export const PaymentOverview = ({
  discountInfo,
  paymentCheckboxes,
  existingPayment,
}: PaymentOverviewProps) => {
  const { getValues } = useFormContext<AdmissionFormValues>();
  const { plan } = getValues();
  const { data: vehicle } = useVehicle(plan?.vehicleId || '');

  // Get discount value from props
  const discountValue = discountInfo.isChecked ? Number(discountInfo.value) || 0 : 0;

  // Determine payment type based on checkboxes
  const paymentType = paymentCheckboxes.installments.isChecked ? 'INSTALLMENTS' : 'FULL_PAYMENT';

  // Check if first installment is already paid
  const isFirstInstallmentPaid =
    existingPayment?.paymentType === 'INSTALLMENTS' &&
    existingPayment?.installmentPayments?.some(
      (installment) => installment.installmentNumber === 1 && installment.isPaid
    );

  const paidFirstInstallment = existingPayment?.installmentPayments?.find(
    (installment) => installment.installmentNumber === 1 && installment.isPaid
  );

  // Use the shared utility function for payment calculations
  const {
    originalAmount: totalFees,
    finalAmount: totalAfterDiscount,
    firstInstallmentAmount,
    secondInstallmentAmount,
  } = calculatePaymentAmounts({
    sessions: plan?.numberOfSessions || 0,
    duration: plan?.sessionDurationInMinutes || 0,
    rate: vehicle?.rent || 0,
    discount: discountValue,
    paymentType,
  });

  // Calculate the amount due based on whether first installment is paid
  const amountDue = isFirstInstallmentPaid ? secondInstallmentAmount : totalAfterDiscount;

  // Format amounts using the shared utility function
  const formattedFees = formatCurrency(totalFees);
  const formattedDiscount = discountValue > 0 ? formatCurrency(discountValue) : null;
  const formattedFirstInstallment = formatCurrency(
    paidFirstInstallment?.amount || firstInstallmentAmount
  );
  const formattedSecondInstallment = formatCurrency(secondInstallmentAmount);
  const formattedAmountDue = formatCurrency(amountDue);

  const isCheckboxChecked = Object.values(paymentCheckboxes).some((checkbox) => checkbox.isChecked);

  return (
    <Card className="p-6 flex flex-col pt-10 min-h-[32rem] h-full">
      <div className="space-y-3">
        <TypographyLarge className="text-primary text-4xl text-center">
          {formattedAmountDue}
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
            <TypographyMuted>Total Fees</TypographyMuted>
            <TypographyMuted className="font-semibold">{formattedFees}</TypographyMuted>
          </div>

          {formattedDiscount && (
            <>
              <div className="flex justify-between mt-2">
                <TypographyMuted>Discount</TypographyMuted>
                <TypographyMuted className="font-semibold text-green-600">
                  -{formattedDiscount}
                </TypographyMuted>
              </div>
            </>
          )}

          {paymentCheckboxes.installments.isChecked && (
            <>
              <div className="flex justify-between mt-4">
                <TypographyMuted className="flex items-center gap-2">
                  1st Installment
                  {isFirstInstallmentPaid && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Received
                    </span>
                  )}
                </TypographyMuted>
                <TypographyMuted
                  className={`font-semibold ${isFirstInstallmentPaid ? 'text-green-600' : ''}`}
                >
                  {formattedFirstInstallment}
                </TypographyMuted>
              </div>
              <div className="flex justify-between mt-2">
                <TypographyMuted>2nd Installment</TypographyMuted>
                <TypographyMuted className="font-semibold">
                  {formattedSecondInstallment}
                </TypographyMuted>
              </div>
            </>
          )}

          {isCheckboxChecked && (
            <>
              <Separator className="my-6" />
              <div className="flex justify-between">
                <TypographyMuted>
                  {isFirstInstallmentPaid ? 'Remaining Due' : 'Total Due'}
                </TypographyMuted>
                <TypographyMuted className="font-semibold">{formattedAmountDue}</TypographyMuted>
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
