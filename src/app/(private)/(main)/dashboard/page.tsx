import { Button } from '@/components/ui/button';
import { DashboardContainer } from '@/features/dashboard/components/dashboard-container/dashboard-container';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="h-full" data-testid="dashboard-page">
      <div className="flex justify-end gap-4">
        <NotificationBell />
        <Link href="/rto-services/add" className="flex gap-2 items-center text-primary">
          <Button variant="secondary" size="lg" data-testid="dashboard-rto-services-button">
            <PlusIcon /> RTO Services
          </Button>
        </Link>
        <Link href="/enrollment" className="flex gap-2 items-center">
          <Button size="lg" data-testid="dashboard-new-admission-button">
            <PlusIcon /> New admission
          </Button>
        </Link>
      </div>

      <DashboardContainer />
    </div>
  );
}
