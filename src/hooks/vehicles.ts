'use client';

import { getVehicle, getVehicles } from '@/server/action/vehicle';
import useSWR from 'swr';

export function useVehicles() {
  const response = useSWR('vehicles', () => getVehicles(), {
    revalidateOnMount: true,
  });

  return response;
}

export function useVehicle(id: string) {
  const response = useSWR(id ? ['vehicle', id] : null, () => getVehicle(id), {
    revalidateOnMount: true,
  });

  return response;
}
