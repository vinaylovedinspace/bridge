import { TypographyH5 } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { PaymentOptions } from './payment-options';
import { PaymentModeSelector } from './payment-mode-selector';
import { PaymentOverview as PaymentOverviewComponent } from './payment-overview';

export { PaymentOverviewComponent as PaymentOverview };

export const PaymentStep = () => {
  return (
    <Card className="grid grid-cols-12 col-span-8 align-center px-6 py-10 h-fit">
      <TypographyH5 className="col-span-3">Payment Info</TypographyH5>
      <PaymentOptions />
      <PaymentModeSelector />
    </Card>
  );
};

// Container component for rendering both PaymentOverview and PaymentStep
export const PaymentContainer = () => {
  return (
    <div className="grid grid-cols-12 gap-6">
      <PaymentStep />
      <div className="col-span-4">
        <PaymentOverviewComponent />
      </div>
    </div>
  );
};
