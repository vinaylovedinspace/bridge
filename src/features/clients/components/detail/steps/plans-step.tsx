'use client';

import { Client } from '@/server/db/client';
import { TypographyH5, TypographyP } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Car, Clock, TrendingUp } from 'lucide-react';

type PlansStepProps = {
  client: NonNullable<Client>;
};

export const PlansStep = ({ client }: PlansStepProps) => {
  const plans = client.plan || [];

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <TypographyH5>Plans</TypographyH5>
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg bg-muted/20">
          <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <TypographyP className="text-muted-foreground font-medium">
            No plans enrolled yet
          </TypographyP>
          <TypographyP className="text-sm text-muted-foreground/70">
            This client has not enrolled in any plans
          </TypographyP>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <TypographyH5>Enrolled Plans</TypographyH5>
        <Badge variant="secondary" className="text-xs">
          {plans.length} {plans.length === 1 ? 'Plan' : 'Plans'}
        </Badge>
      </div>
      <div className="grid gap-5">
        {plans.map((plan, index) => {
          const completedSessions =
            client.sessions?.filter((s) => s.planId === plan.id && s.status === 'COMPLETED')
              .length || 0;
          const totalSessions = plan.numberOfSessions;
          const pendingSessions = totalSessions - completedSessions;

          return (
            <Card key={plan.id} className="overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-end text-lg">
                  <Badge variant={plan.serviceType === 'FULL_SERVICE' ? 'default' : 'secondary'}>
                    {plan.serviceType === 'FULL_SERVICE' ? 'Full Service' : 'Driving Only'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Progress Section */}
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Session Progress</span>
                    <span className="font-semibold">
                      {completedSessions}/{totalSessions}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{completedSessions} completed</span>
                    <span>{pendingSessions} pending</span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Joining Date</p>
                      <p className="text-sm font-semibold">
                        {new Date(plan.joiningDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {plan.joiningTime && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Session Timing</p>
                        <p className="text-sm font-semibold">{plan.joiningTime}</p>
                      </div>
                    </div>
                  )}

                  {plan.vehicleId && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                      <Car className="h-5 w-5 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Assigned Vehicle
                        </p>
                        <p className="text-sm font-semibold">{plan.vehicle.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
