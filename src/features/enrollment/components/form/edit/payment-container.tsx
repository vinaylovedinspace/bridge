'use client';

import { PaymentStep, PaymentOverview } from '@/features/enrollment/components/form/steps/payment';
import { Enrollment } from '@/server/db/plan';

export const PaymentContainer = ({ payment }: { payment: NonNullable<Enrollment>['payment'] }) => {
  // If payment is fully paid, show only the payment summary
  if (payment?.paymentStatus === 'FULLY_PAID') {
    return (
      <div className="grid grid-cols-12 gap-6">
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
          <PaymentOverview existingPayment={payment} isEditMode={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <PaymentStep existingPayment={payment} />
      <div className="col-span-4">
        <PaymentOverview existingPayment={payment} isEditMode={true} />
      </div>

      {/* Show existing payment info if discount was applied */}
      {payment && payment.discount > 0 && (
        <div className="col-span-12 mt-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                Discount Applied: ₹{payment.discount.toLocaleString('en-IN')}
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

type PaymentContainerProps = {
  enrollment: NonNullable<Enrollment>;
};

export const PaymentContainerWithEnrollment = ({ enrollment }: PaymentContainerProps) => {
  const { payment } = enrollment;
  const isPaymentProcessed = payment?.paymentStatus === 'FULLY_PAID';

  if (isPaymentProcessed) {
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
          <PaymentOverview existingPayment={payment} isEditMode={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 px-4">
      <PaymentStep existingPayment={payment} />
      <div className="col-span-4">
        <PaymentOverview existingPayment={payment} isEditMode={true} />
      </div>

      {/* Show existing payment info if discount was applied */}
      {payment && payment.discount > 0 && (
        <div className="col-span-12 mt-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                Discount Applied: ₹{payment.discount.toLocaleString('en-IN')}
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
