'use server';

import {
  getVehicles as getVehiclesFromDB,
  getVehicle as getVehicleFromDB,
} from '@/server/db/vehicle';

export const getVehicles = async (name?: string) => {
  return getVehiclesFromDB(name);
};

export const getVehicle = async (id: string) => {
  return getVehicleFromDB(id);
};
