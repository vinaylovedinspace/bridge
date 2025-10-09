import { Suspense } from 'react';
import {
  AdmissionOverviewSkeleton,
  LicenceWorkWidgetSkeleton,
  InstructorStatusCardSkeleton,
  PendingPaymentsCardSkeleton,
} from './dashboard-skeletons';
import { LicenceWorkWidget } from '../licence-work-widget';
import AdmissionOverview from '../admission-overview';
import { PendingPayments } from '../pending-payments';
import { InstructorStatus } from '../instructor-status';

export const DashboardContainer = () => {
  return (
    <div className="h-full w-full py-10 space-y-6" data-testid="dashboard-container">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <Suspense fallback={<LicenceWorkWidgetSkeleton />}>
            <LicenceWorkWidget />
          </Suspense>
        </div>
        <div className="col-span-4 h-full">
          <Suspense fallback={<PendingPaymentsCardSkeleton />}>
            <PendingPayments />
          </Suspense>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4">
          <Suspense fallback={<InstructorStatusCardSkeleton />}>
            <InstructorStatus />
          </Suspense>
        </div>
        <div className="col-span-8">
          <Suspense fallback={<AdmissionOverviewSkeleton />}>
            <AdmissionOverview />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
