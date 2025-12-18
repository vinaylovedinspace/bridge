import type { PhonePePaymentState } from '@/types/phonepe';

export function mapPhonePeStatusToDbStatus(
  phonePeState: PhonePePaymentState | string
): 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED' {
  switch (phonePeState) {
    case 'COMPLETED':
      return 'SUCCESS';
    case 'FAILED':
      return 'FAILED';
    case 'PENDING':
      return 'PENDING';
    default:
      console.warn(`Unknown PhonePe state: ${phonePeState}, defaulting to PENDING`);
      return 'PENDING';
  }
}
