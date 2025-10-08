import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { LicenceWorkCount } from '../../server/actions';

type AppointmentType = {
  id: string;
  title: string;
  count: number;
  type: 'learning' | 'final' | 'rto';
  link: string;
};

export async function LicenceWorkWidgetCard(stats: LicenceWorkCount) {
  const appointments: AppointmentType[] = [
    {
      id: '1',
      title: 'Learning Test',
      count: stats.learningTestCount,
      type: 'learning',
      link: '/forms/bulk?type=ll',
    },
    {
      id: '2',
      title: 'Final Test',
      count: stats.finalTestCount,
      type: 'final',
      link: '/forms/bulk?type=dl',
    },
    {
      id: '3',
      title: 'R.T.O. Work',
      count: stats.rtoWorkCount,
      type: 'rto',
      link: '/rto-services?status=PENDING',
    },
  ];
  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-pink-50 rounded-full w-8 h-8 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-base font-medium">Pending Schedules</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6 bg-gray-50 py-4 px-6">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="space-y-4 border-r-1 last:border-r-0 h-28">
              <h3 className="text-sm font-medium text-muted-foreground">{appointment.title}</h3>
              <div className="text-4xl font-bold text-foreground">{appointment.count}</div>
              <Link
                className="text-blue-600 hover:text-blue-700 p-0 h-auto font-normal text-sm"
                href={appointment.link}
              >
                View
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
