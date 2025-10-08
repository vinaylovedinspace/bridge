'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function PendingPaymentsCard({ count }: { count: number }) {
  const isCountZero = count === 0;
  return (
    <Card className="w-full max-w-md h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Overdue Payments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex flex-col justify-between h-full">
        <div className="flex items-center gap-4">
          <div
            className={cn('text-6xl font-bold text-red-400', {
              'text-gray-500': isCountZero,
            })}
          >
            {count}
          </div>
          <div className="flex flex-col">
            <p className="text-gray-600">Clients with</p>
            <p className="text-gray-600">Overdue Payments</p>
          </div>
        </div>
        {isCountZero ? (
          <Button variant="outline" className="w-full " disabled={isCountZero}>
            View List
          </Button>
        ) : (
          <Link href="/payments?paymentStatus=PENDING">
            <Button variant="outline" className="w-full " disabled={isCountZero}>
              View List
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
