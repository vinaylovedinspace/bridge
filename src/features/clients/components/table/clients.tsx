import { Suspense } from 'react';
import { ClientDataTable } from './data-table';
import { columns } from './columns';
import { getClients } from '@/server/db/client';

export async function Clients({ name, paymentStatus }: { name?: string; paymentStatus?: string }) {
  const data = await getClients(name, paymentStatus);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientDataTable columns={columns} data={data} />
    </Suspense>
  );
}
