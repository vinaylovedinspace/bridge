import { db } from '@/db';
import { notifications, NewNotification } from '@/db/schema';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from './types';

export class NotificationService {
  static async create(data: Omit<NewNotification, 'createdAt'>) {
    try {
      const [notification] = await db.insert(notifications).values(data).returning();
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  static async createBulk(data: Omit<NewNotification, 'createdAt'>[]) {
    if (data.length === 0) return [];

    try {
      const created = await db.insert(notifications).values(data).returning();
      return created;
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  // Payment notifications
  static async notifyPaymentReceived(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    clientName: string;
    amount: number;
    paymentId: string;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      title: 'Payment Received',
      message: `Payment of ₹${params.amount} received from ${params.clientName}`,
      entityType: ENTITY_TYPES.PAYMENT,
      entityId: parseInt(params.paymentId),
      isRead: false,
    });
  }

  static async notifyInstallmentDue(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    clientName: string;
    amount: number;
    clientId: string;
    isOverdue?: boolean;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: params.isOverdue
        ? NOTIFICATION_TYPES.INSTALLMENT_OVERDUE
        : NOTIFICATION_TYPES.INSTALLMENT_DUE,
      title: params.isOverdue ? 'Installment Overdue' : 'Installment Due Today',
      message: `${params.clientName} has an installment of ₹${params.amount} ${params.isOverdue ? 'overdue' : 'due today'}`,
      entityType: ENTITY_TYPES.CLIENT,
      entityId: parseInt(params.clientId),
      isRead: false,
    });
  }

  // License notifications
  static async notifyLearningTestToday(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    clientName: string;
    clientId: string;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: NOTIFICATION_TYPES.LEARNING_TEST_TODAY,
      title: 'Learning Test Scheduled',
      message: `${params.clientName} has a learning test scheduled for today`,
      entityType: ENTITY_TYPES.CLIENT,
      entityId: parseInt(params.clientId),
      isRead: false,
    });
  }

  static async notifyEligibleForDrivingTest(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    clientName: string;
    clientId: string;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: NOTIFICATION_TYPES.ELIGIBLE_FOR_DRIVING_TEST,
      title: 'Eligible for Driving Test',
      message: `${params.clientName} is now eligible for the driving test`,
      entityType: ENTITY_TYPES.CLIENT,
      entityId: parseInt(params.clientId),
      isRead: false,
    });
  }

  // Vehicle notifications
  static async notifyVehicleDocumentExpiring(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    vehicleNumber: string;
    documentType: 'PUC' | 'Insurance' | 'Registration';
    daysUntilExpiry: number;
    vehicleId: string;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: NOTIFICATION_TYPES.VEHICLE_DOCUMENT_EXPIRING,
      title: `${params.documentType} Expiring Soon`,
      message: `Vehicle ${params.vehicleNumber} ${params.documentType} expires in ${params.daysUntilExpiry} days`,
      entityType: ENTITY_TYPES.VEHICLE,
      entityId: parseInt(params.vehicleId),
      isRead: false,
    });
  }

  // Session notifications
  static async notifySessionToday(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    clientName: string;
    sessionTime: string;
    sessionId: string;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: NOTIFICATION_TYPES.SESSION_TODAY,
      title: 'Training Session Today',
      message: `Training session with ${params.clientName} scheduled at ${params.sessionTime}`,
      entityType: ENTITY_TYPES.SESSION,
      entityId: parseInt(params.sessionId),
      isRead: false,
    });
  }

  // RTO notifications
  static async notifyRTOStatusUpdate(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    serviceName: string;
    status: string;
    rtoServiceId: string;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: NOTIFICATION_TYPES.RTO_STATUS_UPDATED,
      title: 'RTO Service Update',
      message: `${params.serviceName} status updated to ${params.status}`,
      entityType: ENTITY_TYPES.RTO_SERVICE,
      entityId: parseInt(params.rtoServiceId),
      isRead: false,
    });
  }

  // Administrative notifications
  static async notifyNewAdmission(params: {
    tenantId: string;
    branchId: string;
    userId: string;
    clientName: string;
    clientId: string;
  }) {
    return this.create({
      tenantId: parseInt(params.tenantId),
      branchId: parseInt(params.branchId),
      userId: params.userId,
      type: NOTIFICATION_TYPES.NEW_CLIENT_ADMISSION,
      title: 'New Client Admission',
      message: `New client ${params.clientName} has been admitted`,
      entityType: ENTITY_TYPES.CLIENT,
      entityId: parseInt(params.clientId),
      isRead: false,
    });
  }
}
