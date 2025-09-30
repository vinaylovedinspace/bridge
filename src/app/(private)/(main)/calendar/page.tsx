import { TypographyH4 } from '@/components/ui/typography';
import { CalendarView } from '@/features/sessions/components/calendar-view';

const SessionAvailabilityPage = async () => {
  return (
    <div>
      <TypographyH4 data-testid="payments-page-heading" className="mb-4">
        Calendar
      </TypographyH4>
      <CalendarView />
    </div>
  );
};

export default SessionAvailabilityPage;
