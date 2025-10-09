import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionFormSchema, AdmissionFormValues } from '@/features/enrollment/types';
import {
  getDefaultValuesForAddEnrollmentForm,
  getDefaultValuesForEditEnrollmentForm,
} from '../lib/utils';
import { Enrollment } from '@/server/db/plan';
import { getClientById } from '../server/action';

export const useEditAdmissionForm = (enrollment: NonNullable<Enrollment>) => {
  const methods = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: getDefaultValuesForEditEnrollmentForm(enrollment),
    mode: 'onChange',
  });

  return methods;
};

export const useAddAdmissionForm = (
  existingClient?: Awaited<ReturnType<typeof getClientById>>['data']
) => {
  const methods = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: getDefaultValuesForAddEnrollmentForm(existingClient),
    mode: 'onChange',
  });

  return methods;
};
