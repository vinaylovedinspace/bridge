'use client';

import { useQueryState } from 'nuqs';
import { useMemo } from 'react';
import type { Client, ClientDetail } from '@/server/db/client';
import { FormCard } from './form-card';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type FormItem = {
  id: string;
  name: string;
  title: string;
  description: string;
  fileName: string;
  sections: string[];
};

const primaryForms: FormItem[] = [
  {
    id: 'form-1a',
    name: 'Form 1A',
    title: 'Medical Certificate',
    description:
      'Required for applicants aged 40+, or those applying for commercial (transport) licences',
    fileName: 'form-1a.pdf',
    sections: ['Personal Info', 'Medical Details', 'Age Verification'],
  },
  {
    id: 'form-2',
    name: 'Form 2',
    title: 'Application for Learners Licence',
    description:
      'Covers new learners licence, permanent licence, addition of vehicle class, renewal, duplicate licence, and change/correction of DL',
    fileName: 'form-2.pdf',
    sections: ['Personal Info', 'Address', 'Guardian Info', '+1'],
  },
  {
    id: 'form-4a',
    name: 'Form 4A',
    title: 'Application for International Driving Permit (IDP)',
    description:
      'Required along with your valid DL, Medical Certificate, passport & visa copies, photos & applicable fees',
    fileName: 'form-4a.pdf',
    sections: ['Personal Info', 'Driving License', 'Passport', '+1'],
  },
  {
    id: 'form-5',
    name: 'Form 5',
    title: 'Driving School Certificate',
    description: 'Issued by certified driving schools; mandatory for transport licence applicants',
    fileName: 'form-5.pdf',
    sections: ['Personal Info', 'School Details', 'Training Records'],
  },
  {
    id: 'form-5b',
    name: 'Form 5B',
    title: 'ADTC Certificate (Maharashtra)',
    description:
      'Certificate from Accredited Driver Training Centre (ADTC) — exempts from driving test',
    fileName: 'form-5B.pdf',
    sections: ['Personal Info', 'ADTC Details', 'Training Records', '+1'],
  },
  {
    id: 'form-14',
    name: 'Form 14',
    title: 'Enrollment Document',
    description:
      'Register showing the Enrolment of Trainee(s) in the Driving School Establishments',
    fileName: 'form-14.pdf',
    sections: ['Personal Info', 'Address'],
  },
];

type FormsContainerProps = {
  clients: ClientDetail;
};

export function FormsContainer({ clients }: FormsContainerProps) {
  const [selectedClient, setSelectedClient] = useQueryState('client', {
    shallow: false,
  });

  const handleDownload = (fileName: string) => {
    const link = document.createElement('a');
    link.href = `/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (fileName: string) => {
    const printWindow = window.open(`/${fileName}`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const getClientDisplayName = (client: ClientDetail[number]) => {
    const middleName = client.middleName ? ` ${client.middleName}` : '';
    return `${client.firstName}${middleName} ${client.lastName} (${client.clientCode})`;
  };

  const clientOptions: ComboboxOption[] = useMemo(
    () =>
      clients.map((client: ClientDetail[number]) => ({
        value: client.id,
        label: getClientDisplayName(client),
      })),
    [clients]
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Client: </h3>
          <div className="w-96">
            <Combobox
              options={clientOptions}
              value={selectedClient || ''}
              onValueChange={setSelectedClient}
              placeholder="Select a client..."
              searchPlaceholder="Search clients..."
              emptyText="No clients found."
              className="w-full"
              data-testid="client-select"
            />
          </div>
        </div>

        <Link href="/forms/bulk">
          <Button variant="outline">Bulk download</Button>
        </Link>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-8">
          {/* Primary Forms Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Primary Forms</h4>
              <span className="text-sm text-muted-foreground">{primaryForms.length} forms</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {primaryForms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  selectedClient={selectedClient}
                  onPrint={handlePrint}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
