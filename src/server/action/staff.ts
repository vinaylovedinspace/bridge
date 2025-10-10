'use server';

import {
  getStaff as getStaffFromDB,
  getStaffMember as getStaffMemberFromDB,
} from '@/server/db/staff';

export const getStaff = async (name?: string, role?: string) => {
  return getStaffFromDB(name, role);
};

export const getStaffMember = async (id: string) => {
  return getStaffMemberFromDB(id);
};
