import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionFormSchema } from '@/features/enrollment/types';
import { ClientDetail } from '@/server/db/client';
import { ClientFormValues, transformClientToFormData } from '../lib/utils';

export const useEditAdmissionForm = (client: NonNullable<ClientDetail>) => {
  const methods = useForm<ClientFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: transformClientToFormData(client),
    mode: 'onChange',
  });

  return {
    methods,
    ...methods,
  };
};
