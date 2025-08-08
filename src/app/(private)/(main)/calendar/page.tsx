import { TypographyH4 } from '@/components/ui/typography';
import { CalendarView } from '@/features/sessions/components/calendar-view';
import { getCurrentOrganizationBranchId } from '@/server/db/branch';

const SessionAvailabilityPage = async () => {
  const branchId = await getCurrentOrganizationBranchId();

  if (!branchId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-muted-foreground">Unable to find branch information.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TypographyH4 data-testid="payments-page-heading" className="mb-4">
        Calendar
      </TypographyH4>
      <CalendarView branchId={branchId} />
    </div>
  );
};

export default SessionAvailabilityPage;
