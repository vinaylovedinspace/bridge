import { db } from '@/db';
import { formPrints, ClientTable, LearningLicenseTable, DrivingLicenseTable } from '@/db/schema';
import { and, eq, isNull, sql, desc, or, inArray } from 'drizzle-orm';

export type FilterType = 'new-only' | 'all-eligible' | 'recently-printed';

export const getEligibleStudentsForLearnersLicense = async (
  branchId: string,
  filter: FilterType = 'new-only'
) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Base conditions - same logic as needsLearningTest in client.ts
  const baseLearningTestConditions = and(
    eq(ClientTable.branchId, branchId),
    eq(ClientTable.serviceType, 'FULL_SERVICE'),
    sql`(${LearningLicenseTable.licenseNumber} IS NULL OR ${LearningLicenseTable.licenseNumber} = '')`
  );

  let whereConditions = baseLearningTestConditions;

  if (filter === 'new-only') {
    // Students who haven't had Form 2 printed
    whereConditions = and(baseLearningTestConditions, isNull(formPrints.id));
  } else if (filter === 'recently-printed') {
    // Students who had Form 2 printed in the last 7 days
    whereConditions = and(
      baseLearningTestConditions,
      sql`${formPrints.printedAt} >= ${sevenDaysAgo}`
    );
  }

  const results = await db
    .select({
      id: ClientTable.id,
      firstName: ClientTable.firstName,
      lastName: ClientTable.lastName,
      phoneNumber: ClientTable.phoneNumber,
      clientCode: ClientTable.clientCode,
      learningLicenseIssueDate: LearningLicenseTable.issueDate,
      learningLicenseClass: LearningLicenseTable.class,
      daysSinceLearningLicense: sql<number>`0`, // Not applicable for learner's license
      printedAt: formPrints.printedAt,
      printedBy: formPrints.printedBy,
    })
    .from(ClientTable)
    .leftJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .leftJoin(
      formPrints,
      and(eq(formPrints.clientId, ClientTable.id), eq(formPrints.formType, 'form-2'))
    )
    .where(whereConditions)
    .orderBy(desc(ClientTable.createdAt));

  return results.map((result) => ({
    ...result,
    isPrinted: !!result.printedAt,
    daysSincePrint: result.printedAt
      ? Math.floor((Date.now() - result.printedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));
};

export const getEligibleStudentsForPermanentLicense = async (
  branchId: string,
  filter: FilterType = 'new-only'
) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const baseQuery = db
    .select({
      id: ClientTable.id,
      firstName: ClientTable.firstName,
      lastName: ClientTable.lastName,
      phoneNumber: ClientTable.phoneNumber,
      clientCode: ClientTable.clientCode,
      learningLicenseIssueDate: LearningLicenseTable.issueDate,
      learningLicenseClass: LearningLicenseTable.class,
      daysSinceLearningLicense: sql<number>`EXTRACT(DAY FROM AGE(CURRENT_DATE, ${LearningLicenseTable.issueDate}::date))`,
      printedAt: formPrints.printedAt,
      printedBy: formPrints.printedBy,
    })
    .from(ClientTable)
    .innerJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .leftJoin(DrivingLicenseTable, eq(ClientTable.id, DrivingLicenseTable.clientId))
    .leftJoin(
      formPrints,
      and(eq(formPrints.clientId, ClientTable.id), eq(formPrints.formType, 'form-4'))
    );

  let query;

  // Helper function to check if driving license is actually issued (not just empty row)
  const noDrivingLicenseCondition = or(
    isNull(DrivingLicenseTable.id), // No row exists
    isNull(DrivingLicenseTable.licenseNumber), // Row exists but no license number
    isNull(DrivingLicenseTable.issueDate) // Row exists but no issue date
  );

  switch (filter) {
    case 'new-only':
      query = baseQuery.where(
        and(
          eq(ClientTable.branchId, branchId),
          noDrivingLicenseCondition,
          sql`${LearningLicenseTable.issueDate}::date <= ${thirtyDaysAgo.toISOString().split('T')[0]}`,
          isNull(formPrints.id) // Not printed yet
        )
      );
      break;
    case 'recently-printed':
      query = baseQuery.where(
        and(
          eq(ClientTable.branchId, branchId),
          noDrivingLicenseCondition,
          sql`${LearningLicenseTable.issueDate}::date <= ${thirtyDaysAgo.toISOString().split('T')[0]}`,
          sql`${formPrints.printedAt} >= ${sevenDaysAgo.toISOString()}`
        )
      );
      break;
    case 'all-eligible':
      query = baseQuery.where(
        and(
          eq(ClientTable.branchId, branchId),
          noDrivingLicenseCondition,
          sql`${LearningLicenseTable.issueDate}::date <= ${thirtyDaysAgo.toISOString().split('T')[0]}`
        )
      );
      break;
  }

  const results = await query.orderBy(desc(LearningLicenseTable.issueDate));

  return results.map((result) => ({
    ...result,
    isPrinted: !!result.printedAt,
    daysSincePrint: result.printedAt
      ? Math.floor((Date.now() - new Date(result.printedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));
};

export const getBulkClientDataForForms = async (branchId: string, clientIds: string[]) => {
  const clients = await db
    .select({
      id: ClientTable.id,
      firstName: ClientTable.firstName,
      middleName: ClientTable.middleName,
      lastName: ClientTable.lastName,
      clientCode: ClientTable.clientCode,
      phoneNumber: ClientTable.phoneNumber,
      email: ClientTable.email,
      aadhaarNumber: ClientTable.aadhaarNumber,
      panNumber: ClientTable.panNumber,
      birthDate: ClientTable.birthDate,
      bloodGroup: ClientTable.bloodGroup,
      gender: ClientTable.gender,
      address: ClientTable.address,
      city: ClientTable.city,
      state: ClientTable.state,
      pincode: ClientTable.pincode,
      guardianFirstName: ClientTable.guardianFirstName,
      guardianMiddleName: ClientTable.guardianMiddleName,
      guardianLastName: ClientTable.guardianLastName,
      photoUrl: ClientTable.photoUrl,
      signatureUrl: ClientTable.signatureUrl,
      learningLicenseNumber: LearningLicenseTable.licenseNumber,
      learningLicenseIssueDate: LearningLicenseTable.issueDate,
      learningLicenseExpiryDate: LearningLicenseTable.expiryDate,
      learningLicenseClass: LearningLicenseTable.class,
    })
    .from(ClientTable)
    .innerJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .where(and(eq(ClientTable.branchId, branchId), inArray(ClientTable.id, clientIds)));

  return clients;
};

export const insertFormPrints = async (
  branchId: string,
  clientIds: string[],
  formType: string,
  userId: string,
  batchId: string
) => {
  await db.insert(formPrints).values(
    clientIds.map((clientId) => ({
      clientId,
      formType,
      printedBy: userId,
      batchId,
      branchId,
    }))
  );
};
