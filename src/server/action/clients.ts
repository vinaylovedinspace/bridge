'use server';

import {
  getClientsWithUnassignedSessions as getClientsWithUnassignedSessionsFromDB,
  getClients as getClientsFromDB,
  checkPhoneNumberExistsInDB,
  checkAadhaarNumberExistsInDB,
} from '@/server/db/client';

export const getClientsWithUnassignedSessions = async () => {
  return getClientsWithUnassignedSessionsFromDB();
};

export const getClients = async () => {
  return getClientsFromDB();
};

export const checkPhoneNumberDuplicate = async (phoneNumber: string) => {
  return checkPhoneNumberExistsInDB(phoneNumber);
};

export const checkAadhaarNumberDuplicate = async (aadhaarNumber: string) => {
  return checkAadhaarNumberExistsInDB(aadhaarNumber);
};
