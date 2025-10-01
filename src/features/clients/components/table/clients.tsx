import { Suspense } from 'react';
import { ClientDataTable } from './data-table';
import { columns } from './columns';
import { getClients } from '@/server/db/client';

export async function Clients({ name }: { name?: string }) {
  const data = await getClients(name);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientDataTable columns={columns} data={data} />
    </Suspense>
  );
}
