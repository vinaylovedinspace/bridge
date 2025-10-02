import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { PlanTable } from '@/db/schema';

export const getEnrollmentByPlanId = async (id: string) => {
  const client = await db.query.PlanTable.findFirst({
    where: eq(PlanTable.id, id),
    with: {
      client: {
        with: {
          drivingLicense: true,
          learningLicense: true,
        },
      },
      vehicle: true,
      payment: {
        with: {
          installmentPayments: true,
        },
      },
    },
  });

  return client;
};

export type Enrollment = Awaited<ReturnType<typeof getEnrollmentByPlanId>>;
