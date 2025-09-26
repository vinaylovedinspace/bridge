import { db } from '@/db';
import { formPrints, ClientTable } from '@/db/schema';
import { getBranchConfig } from '@/features/admission/server/action';
import { and, eq, desc, inArray } from 'drizzle-orm';

export type FilterType = 'new-only' | 'all-eligible' | 'recently-printed';

export const getEligibleStudentsForLearnersLicense = async (filter: FilterType = 'new-only') => {
  const branchId = (await getBranchConfig()).data?.id as string;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const results = await db.query.ClientTable.findMany({
    where: and(eq(ClientTable.branchId, branchId), eq(ClientTable.serviceType, 'FULL_SERVICE')),
    orderBy: [desc(ClientTable.createdAt)],
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      clientCode: true,
    },
    with: {
      learningLicense: {
        columns: {
          issueDate: true,
          class: true,
        },
      },
      formPrints: {
        where: eq(formPrints.formType, 'form-2'),
        columns: {
          printedAt: true,
          printedBy: true,
        },
      },
    },
  });

  return results
    .filter((result) => {
      // Only include clients who need learning test (no learning license or empty license number)
      const hasNoLearningLicense =
        !result.learningLicense?.licenseNumber || result.learningLicense.licenseNumber === '';

      if (!hasNoLearningLicense) return false;

      // Apply filter-specific logic for form prints
      if (filter === 'new-only') {
        return result.formPrints.length === 0;
      } else if (filter === 'recently-printed') {
        return result.formPrints.some(
          (print) =>
            print.printedAt && new Date(print.printedAt).getTime() >= sevenDaysAgo.getTime()
        );
      }
      return true; // all-eligible
    })
    .map((result) => ({
      id: result.id,
      firstName: result.firstName,
      lastName: result.lastName,
      phoneNumber: result.phoneNumber,
      clientCode: result.clientCode,
      learningLicenseIssueDate: result.learningLicense?.issueDate,
      learningLicenseClass: result.learningLicense?.class,
      daysSinceLearningLicense: 0, // Not applicable for learner's license
      printedAt: result.formPrints[0]?.printedAt,
      printedBy: result.formPrints[0]?.printedBy,
      isPrinted: !!result.formPrints[0]?.printedAt,
      daysSincePrint: result.formPrints[0]?.printedAt
        ? Math.floor(
            (Date.now() - result.formPrints[0].printedAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
    }));
};

export const getEligibleStudentsForPermanentLicense = async (filter: FilterType = 'new-only') => {
  const branchId = (await getBranchConfig()).data?.id as string;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const results = await db.query.ClientTable.findMany({
    where: eq(ClientTable.branchId, branchId),
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      clientCode: true,
    },
    with: {
      learningLicense: {
        columns: {
          issueDate: true,
          class: true,
        },
      },
      drivingLicense: {
        columns: {
          id: true,
          licenseNumber: true,
          issueDate: true,
        },
      },
      formPrints: {
        columns: {
          printedAt: true,
          printedBy: true,
        },
      },
    },
  });

  return results
    .filter((result) => {
      // Check if has learning license issued more than 30 days ago
      const learningLicenseDate = result.learningLicense?.issueDate;
      if (!learningLicenseDate) return false;

      const daysSinceLearning = Math.floor(
        (Date.now() - new Date(learningLicenseDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLearning < 30) return false;

      // Check if has no driving license
      const hasNoDrivingLicense =
        !result.drivingLicense?.licenseNumber && !result.drivingLicense?.issueDate;
      if (!hasNoDrivingLicense) return false;

      // Filter form prints for form-4 only
      const form4Prints = result.formPrints.filter((print) => print.printedAt);

      // Apply filter-specific logic
      if (filter === 'new-only') {
        return form4Prints.length === 0;
      } else if (filter === 'recently-printed') {
        return form4Prints.some(
          (print) => new Date(print.printedAt!).getTime() >= sevenDaysAgo.getTime()
        );
      }
      return true; // all-eligible
    })
    .sort((a, b) => {
      const dateA = new Date(a.learningLicense?.issueDate || 0);
      const dateB = new Date(b.learningLicense?.issueDate || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .map((result) => {
      const daysSinceLearningLicense = result.learningLicense?.issueDate
        ? Math.floor(
            (Date.now() - new Date(result.learningLicense.issueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      const form4Prints = result.formPrints.filter((print) => print.printedAt);
      const latestPrint = form4Prints[0];

      return {
        id: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        phoneNumber: result.phoneNumber,
        clientCode: result.clientCode,
        learningLicenseIssueDate: result.learningLicense?.issueDate,
        learningLicenseClass: result.learningLicense?.class,
        daysSinceLearningLicense,
        printedAt: latestPrint?.printedAt,
        printedBy: latestPrint?.printedBy,
        isPrinted: !!latestPrint?.printedAt,
        daysSincePrint: latestPrint?.printedAt
          ? Math.floor(
              (Date.now() - new Date(latestPrint.printedAt).getTime()) / (1000 * 60 * 60 * 24)
            )
          : null,
      };
    });
};

export const getBulkClientDataForForms = async (branchId: string, clientIds: string[]) => {
  const clients = await db.query.ClientTable.findMany({
    where: and(eq(ClientTable.branchId, branchId), inArray(ClientTable.id, clientIds)),
    columns: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      clientCode: true,
      phoneNumber: true,
      email: true,
      aadhaarNumber: true,
      panNumber: true,
      birthDate: true,
      bloodGroup: true,
      gender: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      guardianFirstName: true,
      guardianMiddleName: true,
      guardianLastName: true,
      photoUrl: true,
      signatureUrl: true,
    },
    with: {
      learningLicense: {
        columns: {
          licenseNumber: true,
          issueDate: true,
          expiryDate: true,
          class: true,
        },
      },
    },
  });

  return clients.map((client) => ({
    id: client.id,
    firstName: client.firstName,
    middleName: client.middleName,
    lastName: client.lastName,
    clientCode: client.clientCode,
    phoneNumber: client.phoneNumber,
    email: client.email,
    aadhaarNumber: client.aadhaarNumber,
    panNumber: client.panNumber,
    birthDate: client.birthDate,
    bloodGroup: client.bloodGroup,
    gender: client.gender,
    address: client.address,
    city: client.city,
    state: client.state,
    pincode: client.pincode,
    guardianFirstName: client.guardianFirstName,
    guardianMiddleName: client.guardianMiddleName,
    guardianLastName: client.guardianLastName,
    photoUrl: client.photoUrl,
    signatureUrl: client.signatureUrl,
    learningLicenseNumber: client.learningLicense?.licenseNumber,
    learningLicenseIssueDate: client.learningLicense?.issueDate,
    learningLicenseExpiryDate: client.learningLicense?.expiryDate,
    learningLicenseClass: client.learningLicense?.class,
  }));
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
