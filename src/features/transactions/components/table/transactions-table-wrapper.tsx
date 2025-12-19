'use client';

import { format } from 'date-fns';
import type { Transaction } from '@/server/db/transactions';
import { TransactionFilters } from '../filters';
import { columns } from './columns';
import { TransactionDataTable } from './data-table';

type TransactionsTableWrapperProps = {
  data: Transaction[];
};

export function TransactionsTableWrapper({ data }: TransactionsTableWrapperProps) {
  const handleExport = () => {
    const csv = [
      [
        'Date',
        'Client Name',
        'Client Code',
        'Type',
        'Amount',
        'Mode',
        'Status',
        'Reference',
        'Gateway',
        'Installment',
        'Notes',
      ],
      ...data
        .filter((txn) => txn.payment?.client) // Skip rows without client
        .map((txn) => [
          txn.txnDate ? format(new Date(txn.txnDate), 'dd MMM yyyy, hh:mm a') : '-',
          txn.payment.client
            ? `${txn.payment.client.firstName} ${txn.payment.client.lastName}`
            : '-',
          txn.payment.client ? `CS-${txn.payment.client.clientCode}` : '-',
          txn.payment.rtoService ? 'RTO Service' : txn.payment.plan ? 'Enrollment' : '-',
          `₹${txn.amount.toLocaleString('en-IN')}`,
          txn.paymentMode.replace('_', ' '),
          txn.transactionStatus,
          txn.transactionReference || '-',
          txn.paymentGateway || '-',
          txn.installmentNumber ? `#${txn.installmentNumber}` : '-',
          txn.notes || '-',
        ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <TransactionFilters data={data} onExport={handleExport} />
      <TransactionDataTable columns={columns} data={data} />
    </div>
  );
}
