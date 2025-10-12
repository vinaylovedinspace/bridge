import { TypographyH5 } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { PaymentOptions } from './payment-options';
import { PaymentModeSelector } from './payment-mode-selector';
import { PaymentOverview } from './payment-overview';
import { getRTOService } from '@/features/rto-services/server/db';

type PaymentStepProps = {
  existingPayment?: NonNullable<Awaited<ReturnType<typeof getRTOService>>>['payment'];
};

export const PaymentStep = ({ existingPayment }: PaymentStepProps) => {
  return (
    <Card className="grid grid-cols-12 col-span-8 align-center px-6 py-10 h-fit">
      <TypographyH5 className="col-span-3">Payment Info</TypographyH5>
      <PaymentOptions existingPayment={existingPayment} />
      <PaymentModeSelector />
    </Card>
  );
};

// Container component for rendering both PaymentOverview and PaymentStep
type PaymentContainerProps = {
  existingPayment?: NonNullable<Awaited<ReturnType<typeof getRTOService>>>['payment'];
};

export const PaymentContainer = ({ existingPayment }: PaymentContainerProps) => {
  // If payment is fully paid, show only the payment summary
  if (existingPayment?.paymentStatus === 'FULLY_PAID') {
    return (
      <div className="grid grid-cols-12 gap-6 px-4">
        <div className="col-span-12">
          <div className="p-6 bg-green-50 border border-green-200 rounded-md mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-base font-semibold text-green-800">Payment Completed</span>
            </div>
            <p className="text-sm text-green-700 mt-2">
              This payment has been fully completed. No further action is required.
            </p>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 md:col-start-4">
          <PaymentOverview existingPayment={existingPayment} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 px-4">
      <PaymentStep existingPayment={existingPayment} />
      <div className="col-span-4">
        <PaymentOverview existingPayment={existingPayment} />
      </div>

      {/* Show existing payment info if discount was applied */}
      {existingPayment && existingPayment.discount > 0 && (
        <div className="col-span-12 mt-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                Discount Applied: ₹{existingPayment.discount.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              This discount has been applied to the original payment calculation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
