import { db } from '@/db';
import { VehicleTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { triggerVehicleDocumentExpiryWorkflow } from '@/lib/upstash/trigger-vehicle-document-expiry';

export const addVehicle = async (data: typeof VehicleTable.$inferInsert) => {
  const [vehicle] = await db.insert(VehicleTable).values(data).returning();

  // Trigger workflows for document expiry notifications
  if (vehicle.pucExpiry) {
    await triggerVehicleDocumentExpiryWorkflow({
      vehicleId: vehicle.id,
      documentType: 'PUC',
      expiryDate: vehicle.pucExpiry,
    });
  }

  if (vehicle.insuranceExpiry) {
    await triggerVehicleDocumentExpiryWorkflow({
      vehicleId: vehicle.id,
      documentType: 'INSURANCE',
      expiryDate: vehicle.insuranceExpiry,
    });
  }

  if (vehicle.registrationExpiry) {
    await triggerVehicleDocumentExpiryWorkflow({
      vehicleId: vehicle.id,
      documentType: 'REGISTRATION',
      expiryDate: vehicle.registrationExpiry,
    });
  }

  return vehicle;
};

export const updateVehicle = async (id: string, data: typeof VehicleTable.$inferInsert) => {
  try {
    const [vehicle] = await db
      .update(VehicleTable)
      .set(data)
      .where(eq(VehicleTable.id, id))
      .returning();

    // Trigger workflows for updated document expiry dates
    if (vehicle.pucExpiry) {
      await triggerVehicleDocumentExpiryWorkflow({
        vehicleId: vehicle.id,
        documentType: 'PUC',
        expiryDate: vehicle.pucExpiry,
      });
    }

    if (vehicle.insuranceExpiry) {
      await triggerVehicleDocumentExpiryWorkflow({
        vehicleId: vehicle.id,
        documentType: 'INSURANCE',
        expiryDate: vehicle.insuranceExpiry,
      });
    }

    if (vehicle.registrationExpiry) {
      await triggerVehicleDocumentExpiryWorkflow({
        vehicleId: vehicle.id,
        documentType: 'REGISTRATION',
        expiryDate: vehicle.registrationExpiry,
      });
    }

    return vehicle;
  } catch (error) {
    console.log(error);
  }
};

export const deleteVehicle = async (id: string, branchId: string) => {
  try {
    const [vehicle] = await db
      .update(VehicleTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(VehicleTable.id, id), eq(VehicleTable.branchId, branchId)))
      .returning();

    return vehicle;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
