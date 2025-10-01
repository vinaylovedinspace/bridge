import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionFormSchema, AdmissionFormValues } from '@/features/enrollment/types';
import { transformClientToFormData } from '../lib/utils';
import { Enrollment } from '@/server/db/plan';

export const useEditAdmissionForm = (enrollment: NonNullable<Enrollment>) => {
  const methods = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: transformClientToFormData(enrollment),
    mode: 'onChange',
  });

  return {
    methods,
    ...methods,
  };
};
