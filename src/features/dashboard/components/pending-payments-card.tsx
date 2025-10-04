'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PendingPaymentsCardProps {
  pendingCount: number;
}

export const PendingPaymentsCard = ({ pendingCount }: PendingPaymentsCardProps) => {
  return (
    <Card className="w-full max-w-md h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Overdue Payments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex flex-col justify-between h-full">
        <div className="flex items-center gap-4">
          <div className="text-6xl font-bold text-red-400">{pendingCount}</div>
          <div className="flex flex-col">
            <p className="text-gray-600">Clients with</p>
            <p className="text-gray-600">Overdue Payments</p>
          </div>
        </div>
        <Link href="/enrollments?paymentStatus=OVERDUE">
          <Button variant="outline" className="w-full">
            View List
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
