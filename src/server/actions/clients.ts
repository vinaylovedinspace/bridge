'use server';

import {
  getClientsWithUnassignedSessions as getClientsWithUnassignedSessionsFromDB,
  getClients as getClientsFromDB,
} from '@/server/db/client';

export const getClientsWithUnassignedSessions = async () => {
  return getClientsWithUnassignedSessionsFromDB();
};

export const getClients = async () => {
  return getClientsFromDB();
};
