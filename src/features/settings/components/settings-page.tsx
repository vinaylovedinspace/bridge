'use client';

import { SettingsForm } from './settings-form';
import { useBranchSettings } from '../hooks/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SettingsPageProps {
  branchId: string;
}

export const SettingsPage = ({ branchId }: SettingsPageProps) => {
  const { data: settings, isLoading, error } = useBranchSettings();

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Failed to load branch settings. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && !settings) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Failed to load branch settings. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-92px)] pr-10" id="settings-page">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Branch Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure working days, operating hours, RTO office, and service fees for your branch
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {/* Working Days Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4 mb-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center space-y-2">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-5 w-5 rounded" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>

            {/* Operating Hours Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>

            {/* RTO Office Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>

            {/* Service Fee Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <SettingsForm branchId={branchId} initialData={settings} />
        )}
      </div>
    </ScrollArea>
  );
};
