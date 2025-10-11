import { Suspense } from 'react';
import { getRTOServices } from '../../server/db';
import { type RTOServiceStatus, type RTOServiceType } from '../../types';
import { DataTable } from './data-table';
import { columns } from './columns';
import { getBranchConfig } from '@/server/action/branch';
import { Skeleton } from '@/components/ui/skeleton';

type RTOServicesProps = {
  status?: string;
  serviceType?: string;
  search?: string;
};

export async function RTOServices({ status, serviceType, search }: RTOServicesProps) {
  const { id: branchId } = await getBranchConfig();

  const filters = {
    ...(status && { status: status as RTOServiceStatus }),
    ...(serviceType && { serviceType: serviceType as RTOServiceType }),
    ...(search && { search }),
  };

  const data = await getRTOServices(branchId, filters);

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DataTable columns={columns} data={data} />
    </Suspense>
  );
}
