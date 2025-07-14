import { db } from '@/db';
import { VehicleTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, ilike, and, or, lte, isNotNull } from 'drizzle-orm';
import { getCurrentOrganizationBranchId } from '@/server/db/branch';

const _getVehicles = async (branchId: string, name?: string) => {
  // Create a base condition for the organization
  const conditions = [eq(VehicleTable.branchId, branchId)];

  // Only add the name filter if name is defined and not empty
  if (name) {
    conditions.push(ilike(VehicleTable.name, `%${name}%`));
  }

  const vehicles = await db.query.VehicleTable.findMany({
    where: and(...conditions),
  });

  return vehicles;
};

export const getVehicles = async (name?: string) => {
  const { userId } = await auth();
  const branchId = await getCurrentOrganizationBranchId();

  if (!userId || !branchId) {
    return [];
  }

  return await _getVehicles(branchId, name);
};

const _getVehicle = async (id: string) => {
  const vehicle = await db.query.VehicleTable.findFirst({
    where: eq(VehicleTable.id, id),
  });

  return vehicle;
};

export const getVehicle = async (id: string) => {
  const { userId } = await auth();

  if (!userId || !id || id.trim() === '') {
    return null;
  }

  return await _getVehicle(id);
};

const _getVehicleDocumentExpiry = async (branchId: string) => {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const vehicles = await db
    .select({
      id: VehicleTable.id,
      name: VehicleTable.name,
      number: VehicleTable.number,
      pucExpiry: VehicleTable.pucExpiry,
      insuranceExpiry: VehicleTable.insuranceExpiry,
      registrationExpiry: VehicleTable.registrationExpiry,
    })
    .from(VehicleTable)
    .where(
      and(
        eq(VehicleTable.branchId, branchId),
        or(
          // PUC expiring soon or expired
          and(
            isNotNull(VehicleTable.pucExpiry),
            lte(VehicleTable.pucExpiry, thirtyDaysFromNow.toISOString().split('T')[0])
          ),
          // Insurance expiring soon or expired
          and(
            isNotNull(VehicleTable.insuranceExpiry),
            lte(VehicleTable.insuranceExpiry, thirtyDaysFromNow.toISOString().split('T')[0])
          ),
          // Registration expiring soon or expired
          and(
            isNotNull(VehicleTable.registrationExpiry),
            lte(VehicleTable.registrationExpiry, thirtyDaysFromNow.toISOString().split('T')[0])
          )
        )
      )
    );

  // Process each vehicle to create document expiry items
  const documentExpiryItems: Array<{
    documentType: 'PUC' | 'Insurance' | 'Registration Document';
    vehicleName: string;
    vehicleNumber: string;
    expiryDate: string;
    status: 'Expired' | 'Expiring Soon';
  }> = [];

  vehicles.forEach((vehicle) => {
    const checkDocument = (
      expiryDate: string | null,
      documentType: 'PUC' | 'Insurance' | 'Registration Document'
    ) => {
      if (!expiryDate) return;

      const expiry = new Date(expiryDate);
      const isExpired = expiry < today;
      const isExpiringSoon = expiry <= thirtyDaysFromNow && expiry >= today;

      if (isExpired || isExpiringSoon) {
        documentExpiryItems.push({
          documentType,
          vehicleName: vehicle.name,
          vehicleNumber: vehicle.number,
          expiryDate,
          status: isExpired ? 'Expired' : 'Expiring Soon',
        });
      }
    };

    checkDocument(vehicle.pucExpiry, 'PUC');
    checkDocument(vehicle.insuranceExpiry, 'Insurance');
    checkDocument(vehicle.registrationExpiry, 'Registration Document');
  });

  // Sort by expiry date (expired first, then by date)
  return documentExpiryItems.sort((a, b) => {
    if (a.status === 'Expired' && b.status !== 'Expired') return -1;
    if (a.status !== 'Expired' && b.status === 'Expired') return 1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
};

export const getVehicleDocumentExpiry = async () => {
  const { userId } = await auth();
  const branchId = await getCurrentOrganizationBranchId();

  if (!userId || !branchId) {
    return [];
  }

  return await _getVehicleDocumentExpiry(branchId);
};

export type Vehicle = Awaited<ReturnType<typeof getVehicle>>;
export type VehicleDocumentExpiry = Awaited<ReturnType<typeof getVehicleDocumentExpiry>>[0];
