'use server';

import { z } from 'zod';
import { clientSchema } from '@/types/zod/client';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import { ActionReturnType } from '@/types/actions';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import { db } from '@/db';
import { ClientTable } from '@/db/schema/client/columns';
import { LearningLicenseTable } from '@/db/schema/learning-licenses/columns';
import { DrivingLicenseTable } from '@/db/schema/driving-licenses/columns';
import { eq } from 'drizzle-orm';

export const updateClientPersonalInfo = async (
  clientId: string,
  unsafeData: z.infer<typeof clientSchema>
): ActionReturnType => {
  try {
    if (!clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    // Validate the personal info data
    const parseResult = clientSchema.safeParse(unsafeData);

    if (!parseResult.success) {
      return { error: true, message: 'Invalid personal information data' };
    }

    const data = parseResult.data;

    // Convert birthDate to string
    const birthDateString =
      data.birthDate instanceof Date
        ? formatDateToYYYYMMDD(data.birthDate)
        : typeof data.birthDate === 'string'
          ? data.birthDate
          : '';

    if (!birthDateString) {
      return { error: true, message: 'Birth date is required' };
    }

    // Update client in database
    await db
      .update(ClientTable)
      .set({
        aadhaarNumber: data.aadhaarNumber,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        gender: data.gender,
        birthDate: birthDateString,
        bloodGroup: data.bloodGroup,
        educationalQualification: data.educationalQualification,
        guardianFirstName: data.guardianFirstName,
        guardianMiddleName: data.guardianMiddleName,
        guardianLastName: data.guardianLastName,
        guardianRelationship: data.guardianRelationship,
        phoneNumber: data.phoneNumber,
        alternativePhoneNumber: data.alternativePhoneNumber,
        email: data.email,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        addressLine3: data.addressLine3,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        permanentAddressLine1: data.permanentAddressLine1,
        permanentAddressLine2: data.permanentAddressLine2,
        permanentAddressLine3: data.permanentAddressLine3,
        permanentCity: data.permanentCity,
        permanentState: data.permanentState,
        permanentPincode: data.permanentPincode,
        citizenStatus: data.citizenStatus,
        updatedAt: new Date(),
      })
      .where(eq(ClientTable.id, clientId));

    return {
      error: false,
      message: 'Personal information updated successfully',
    };
  } catch (error) {
    console.error('Error updating client personal info:', error);
    return { error: true, message: 'Failed to update personal information' };
  }
};

export const updateClientLearningLicense = async (
  clientId: string,
  unsafeData: z.infer<typeof learningLicenseSchema>
): ActionReturnType => {
  try {
    if (!clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    // Validate the learning license data
    const parseResult = learningLicenseSchema.safeParse(unsafeData);

    if (!parseResult.success) {
      return { error: true, message: 'Invalid learning licence data' };
    }

    const data = parseResult.data;

    // Convert date fields to strings
    const learningLicenseData = {
      clientId,
      licenseNumber: data.licenseNumber || null,
      applicationNumber: data.applicationNumber || null,
      testConductedOn: data.testConductedOn ? formatDateToYYYYMMDD(data.testConductedOn) : null,
      issueDate: data.issueDate ? formatDateToYYYYMMDD(data.issueDate) : null,
      expiryDate: data.expiryDate ? formatDateToYYYYMMDD(data.expiryDate) : null,
      updatedAt: new Date(),
    };

    // Check if learning license exists for this client
    const existingLicense = await db.query.LearningLicenseTable.findFirst({
      where: eq(LearningLicenseTable.clientId, clientId),
    });

    if (existingLicense) {
      // Update existing learning license
      await db
        .update(LearningLicenseTable)
        .set(learningLicenseData)
        .where(eq(LearningLicenseTable.clientId, clientId));
    } else {
      // Create new learning license
      await db.insert(LearningLicenseTable).values(learningLicenseData);
    }

    return {
      error: false,
      message: 'Learning licence updated successfully',
    };
  } catch (error) {
    console.error('Error updating learning license:', error);
    return { error: true, message: 'Failed to update learning licence' };
  }
};

export const updateClientDrivingLicense = async (
  clientId: string,
  unsafeData: z.infer<typeof drivingLicenseSchema>
): ActionReturnType => {
  try {
    if (!clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    // Validate the driving license data
    const parseResult = drivingLicenseSchema.safeParse(unsafeData);

    if (!parseResult.success) {
      return { error: true, message: 'Invalid driving licence data' };
    }

    const data = parseResult.data;

    // Convert date fields to strings
    const drivingLicenseData = {
      clientId,
      licenseNumber: data.licenseNumber || null,
      applicationNumber: data.applicationNumber || null,
      appointmentDate: data.appointmentDate ? formatDateToYYYYMMDD(data.appointmentDate) : null,
      issueDate: data.issueDate ? formatDateToYYYYMMDD(data.issueDate) : null,
      expiryDate: data.expiryDate ? formatDateToYYYYMMDD(data.expiryDate) : null,
      testConductedBy: data.testConductedBy || null,
      imv: data.imv || null,
      rto: data.rto || null,
      department: data.department || null,
      updatedAt: new Date(),
    };

    // Check if driving license exists for this client
    const existingLicense = await db.query.DrivingLicenseTable.findFirst({
      where: eq(DrivingLicenseTable.clientId, clientId),
    });

    if (existingLicense) {
      // Update existing driving license
      await db
        .update(DrivingLicenseTable)
        .set(drivingLicenseData)
        .where(eq(DrivingLicenseTable.clientId, clientId));
    } else {
      // Create new driving license
      await db.insert(DrivingLicenseTable).values(drivingLicenseData);
    }

    return {
      error: false,
      message: 'Driving licence updated successfully',
    };
  } catch (error) {
    console.error('Error updating driving license:', error);
    return { error: true, message: 'Failed to update driving licence' };
  }
};
