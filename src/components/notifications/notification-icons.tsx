import {
  CreditCard,
  Calendar,
  FileText,
  Car,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  Bell,
} from 'lucide-react';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export function getNotificationIcon(type: string) {
  switch (type) {
    // Payment & Financial
    case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
      return CreditCard;
    case NOTIFICATION_TYPES.INSTALLMENT_DUE:
    case NOTIFICATION_TYPES.INSTALLMENT_OVERDUE:
    case NOTIFICATION_TYPES.PAY_LATER_REMINDER:
      return Clock;
    case NOTIFICATION_TYPES.REFUND_PROCESSED:
      return RefreshCw;

    // License & Testing
    case NOTIFICATION_TYPES.LEARNING_TEST_TODAY:
    case NOTIFICATION_TYPES.ELIGIBLE_FOR_DRIVING_TEST:
      return Calendar;
    case NOTIFICATION_TYPES.LICENSE_ISSUED:
      return CheckCircle;
    case NOTIFICATION_TYPES.LICENSE_RENEWAL_DUE:
      return AlertCircle;

    // Vehicle Management
    case NOTIFICATION_TYPES.VEHICLE_DOCUMENT_EXPIRING:
    case NOTIFICATION_TYPES.VEHICLE_DOCUMENT_EXPIRED:
    case NOTIFICATION_TYPES.VEHICLE_MAINTENANCE_DUE:
      return Car;

    // Training & Sessions
    case NOTIFICATION_TYPES.SESSION_TODAY:
      return Calendar;
    case NOTIFICATION_TYPES.SESSION_CANCELLED:
      return XCircle;
    case NOTIFICATION_TYPES.SESSION_RESCHEDULED:
      return RefreshCw;

    // RTO Services
    case NOTIFICATION_TYPES.RTO_STATUS_UPDATED:
    case NOTIFICATION_TYPES.RTO_SERVICE_COMPLETED:
    case NOTIFICATION_TYPES.RTO_TATKAL_DEADLINE:
      return FileText;

    // Administrative
    case NOTIFICATION_TYPES.NEW_CLIENT_ADMISSION:
      return Users;
    case NOTIFICATION_TYPES.REPORT_READY:
      return FileText;
    case NOTIFICATION_TYPES.LOW_CAPACITY_WARNING:
      return AlertCircle;

    default:
      return Bell;
  }
}
