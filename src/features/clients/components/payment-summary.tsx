'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

type PaymentSummaryProps = {
  payment: {
    id: string;
    originalAmount: number;
    discount: number;
    finalAmount: number;
    paymentStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID';
    paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
    fullPaymentDate?: Date | null;
    fullPaymentMode?: string | null;
    fullPaymentPaid?: boolean;
    firstInstallmentAmount?: number | null;
    firstPaymentMode?: string | null;
    firstInstallmentDate?: Date | null;
    firstInstallmentPaid?: boolean;
    secondInstallmentAmount?: number | null;
    secondPaymentMode?: string | null;
    secondInstallmentDate?: Date | null;
    secondInstallmentPaid?: boolean;
    paymentDueDate?: Date | null;
    createdAt: Date;
  };
};

const getStatusIcon = (status: string, paid?: boolean) => {
  if (paid) return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'FULLY_PAID') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'PARTIALLY_PAID') return <Clock className="w-4 h-4 text-yellow-500" />;
  return <AlertCircle className="w-4 h-4 text-red-500" />;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'FULLY_PAID':
      return <Badge variant="default">Fully Paid</Badge>;
    case 'PARTIALLY_PAID':
      return <Badge variant="secondary">Partially Paid</Badge>;
    case 'PENDING':
      return <Badge variant="destructive">Pending</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export const PaymentSummary = ({ payment }: PaymentSummaryProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Payment Summary
            {getStatusBadge(payment.paymentStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Original Amount</p>
              <p className="font-semibold">{formatAmount(payment.originalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Discount</p>
              <p className="font-semibold">{formatAmount(payment.discount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Final Amount</p>
              <p className="font-semibold text-lg">{formatAmount(payment.finalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Type</p>
              <p className="font-semibold">{payment.paymentType.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {payment.paymentType === 'FULL_PAYMENT' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(payment.paymentStatus, payment.fullPaymentPaid)}
              Full Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {payment.fullPaymentDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-semibold">
                    {format(new Date(payment.fullPaymentDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              {payment.fullPaymentMode && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Mode</p>
                  <p className="font-semibold">{payment.fullPaymentMode.replace('_', ' ')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {payment.paymentType === 'INSTALLMENTS' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {getStatusIcon('', payment.firstInstallmentPaid)}
                First Installment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    {formatAmount(payment.firstInstallmentAmount || 0)}
                  </p>
                </div>
                {payment.firstInstallmentDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-semibold">
                      {format(new Date(payment.firstInstallmentDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
                {payment.firstPaymentMode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Mode</p>
                    <p className="font-semibold">{payment.firstPaymentMode.replace('_', ' ')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {getStatusIcon('', payment.secondInstallmentPaid)}
                Second Installment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    {formatAmount(payment.secondInstallmentAmount || 0)}
                  </p>
                </div>
                {payment.secondInstallmentDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-semibold">
                      {format(new Date(payment.secondInstallmentDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
                {payment.secondPaymentMode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Mode</p>
                    <p className="font-semibold">{payment.secondPaymentMode.replace('_', ' ')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p>Payment created on {format(new Date(payment.createdAt), "MMM dd, yyyy 'at' h:mm a")}</p>
        <p className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <strong>Note:</strong> This payment has been processed and cannot be modified. Contact
          support if changes are needed.
        </p>
      </div>
    </div>
  );
};
