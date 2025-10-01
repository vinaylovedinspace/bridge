import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionFormSchema, AdmissionFormValues } from '@/features/enrollment/types';
import { getDefaultValuesForEnrollmentForm } from '../lib/utils';
import { Enrollment } from '@/server/db/plan';

export const useEditAdmissionForm = (enrollment: NonNullable<Enrollment>) => {
  const methods = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: getDefaultValuesForEnrollmentForm(enrollment),
    mode: 'onChange',
  });

  return {
    methods,
    ...methods,
  };
};
