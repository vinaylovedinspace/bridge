import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AppointmentsWidgetSkeleton() {
  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-64" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6 bg-gray-50 py-4 px-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PendingPaymentsCardSkeleton() {
  return (
    <Card className="w-full max-w-md h-full">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-6 flex flex-col justify-between h-full">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded" />
      </CardContent>
    </Card>
  );
}

export function InstructorStatusCardSkeleton() {
  return (
    <Card className="w-full max-w-md h-full">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col justify-between h-full">
        <div className="flex-1">
          <div className="h-48 flex items-center justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded" />
      </CardContent>
    </Card>
  );
}

export function AdmissionOverviewSkeleton() {
  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-40 rounded" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="min-h-[250px] w-full flex items-center justify-center">
          <div className="space-y-4 w-full">
            <div className="flex items-end justify-around h-[200px] px-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton
                  key={i}
                  className="w-8"
                  style={{ height: `${Math.random() * 100 + 50}px` }}
                />
              ))}
            </div>
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
