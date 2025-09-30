import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionFormSchema } from '@/features/admission/types';
import { ClientDetail } from '@/server/db/client';
import { ClientFormValues, transformClientToFormData } from '../utils/transform-client-data';

export const useClientForm = (client: NonNullable<ClientDetail>) => {
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
