'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, Path, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { type StepConfig } from '@/components/ui/progress-bar';
import { PersonalInfoStep } from './steps/personal-info';
import { ServiceDetailsStep } from './steps/service-details';
import { rtoServiceFormSchema, type RTOServiceFormData } from '../../schemas/rto-services';
import { addRTOService, updateRTOService } from '../../server/action';
import { type RTOServiceWithClient } from '../../types';
import { DEFAULT_STATE } from '@/lib/constants/business';

// RTO Services step configuration
export const RTO_STEPS: StepConfig<'service' | 'personal'>[] = [
  { key: 'service', label: 'Service Details' },
  { key: 'personal', label: 'Personal Info' },
];

const sortOrder = ['service', 'personal'] as const;
type StepKey = (typeof sortOrder)[number];

type RTOServiceMultistepFormProps = {
  rtoService?: RTOServiceWithClient;
  defaultRtoOffice?: string | null;
};

export function RTOServiceMultistepForm({
  rtoService,
  defaultRtoOffice,
}: RTOServiceMultistepFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialFormDataRef = useRef<RTOServiceFormData | null>(null);

  // URL state management
  const [externalStep, setExternalStep] = useQueryState(
    'step',
    parseAsStringLiteral(sortOrder).withDefault('service')
  );

  // Form setup
  const form = useForm<RTOServiceFormData>({
    resolver: zodResolver(rtoServiceFormSchema),
    mode: 'onChange',
    defaultValues: {
      serviceType: rtoService?.serviceType || 'LICENSE_RENEWAL',
      status: rtoService?.status || 'PENDING',
      priority: rtoService?.priority || 'NORMAL',
      rtoOffice: rtoService?.rtoOffice || defaultRtoOffice || '',
      existingLicenseNumber: rtoService?.existingLicenseNumber || '',
      governmentFees: rtoService?.governmentFees || 0,
      serviceCharge: rtoService?.serviceCharge || 0,
      urgentFees: rtoService?.urgentFees || 0,
      totalAmount: rtoService?.totalAmount || 0,
      remarks: rtoService?.remarks || '',
      requiresClientPresence: rtoService?.requiresClientPresence || false,
      isDocumentCollectionComplete: rtoService?.isDocumentCollectionComplete || false,
      isPaymentComplete: rtoService?.isPaymentComplete || false,
      clientInfo: {
        firstName: rtoService?.rtoClient?.firstName || '',
        middleName: rtoService?.rtoClient?.middleName || '',
        lastName: rtoService?.rtoClient?.lastName || '',
        aadhaarNumber: rtoService?.rtoClient?.aadhaarNumber || '',
        phoneNumber: rtoService?.rtoClient?.phoneNumber || '',
        email: '',
        address: '',
        city: '',
        state: DEFAULT_STATE,
        pincode: '',
        birthDate: new Date(),
        gender: 'MALE',
        // Additional personal information
        fatherName: '',
        bloodGroup: undefined,
        // Document information
        passportNumber: '',
        // Emergency contact
        emergencyContact: '',
        emergencyContactName: '',
        // Address fields
        isCurrentAddressSameAsPermanentAddress: true,
        permanentAddress: '',
        permanentCity: '',
        permanentState: DEFAULT_STATE,
        permanentPincode: '',
      },
    },
  });

  // Store initial form data for change detection
  useEffect(() => {
    if (!initialFormDataRef.current) {
      initialFormDataRef.current = form.getValues();
    }
  }, [form]);

  // Get default values based on existing service or defaults
  const getDefaultValues = (): RTOServiceFormData => {
    return {
      serviceType: rtoService?.serviceType || 'LICENSE_RENEWAL',
      status: rtoService?.status || 'PENDING',
      priority: rtoService?.priority || 'NORMAL',
      rtoOffice: rtoService?.rtoOffice || defaultRtoOffice || '',
      existingLicenseNumber: rtoService?.existingLicenseNumber || '',
      governmentFees: rtoService?.governmentFees || 0,
      serviceCharge: rtoService?.serviceCharge || 0,
      urgentFees: rtoService?.urgentFees || 0,
      totalAmount: rtoService?.totalAmount || 0,
      remarks: rtoService?.remarks || '',
      requiresClientPresence: rtoService?.requiresClientPresence || false,
      isDocumentCollectionComplete: rtoService?.isDocumentCollectionComplete || false,
      isPaymentComplete: rtoService?.isPaymentComplete || false,
      clientInfo: {
        firstName: rtoService?.rtoClient?.firstName || '',
        middleName: rtoService?.rtoClient?.middleName || '',
        lastName: rtoService?.rtoClient?.lastName || '',
        aadhaarNumber: rtoService?.rtoClient?.aadhaarNumber || '',
        phoneNumber: rtoService?.rtoClient?.phoneNumber || '',
        email: '',
        address: '',
        city: '',
        state: DEFAULT_STATE,
        pincode: '',
        birthDate: new Date(),
        gender: 'MALE',
        fatherName: '',
        bloodGroup: undefined,
        passportNumber: '',
        emergencyContact: '',
        emergencyContactName: '',
        isCurrentAddressSameAsPermanentAddress: true,
        permanentAddress: '',
        permanentCity: '',
        permanentState: DEFAULT_STATE,
        permanentPincode: '',
      },
    };
  };

  // Watch all form values to detect changes
  const watchedValues = form.watch();

  // Check if current step has any changes compared to original values
  const hasCurrentStepChanges = (): boolean => {
    if (!rtoService) return false; // No changes to detect for new services

    const originalValues = getDefaultValues();
    const currentStepKey = externalStep;

    const getCurrentStepValues = () => {
      switch (currentStepKey) {
        case 'service':
          return {
            serviceType: watchedValues.serviceType,
            status: watchedValues.status,
            priority: watchedValues.priority,
            rtoOffice: watchedValues.rtoOffice,
            existingLicenseNumber: watchedValues.existingLicenseNumber,
            governmentFees: watchedValues.governmentFees,
            serviceCharge: watchedValues.serviceCharge,
            urgentFees: watchedValues.urgentFees,
            totalAmount: watchedValues.totalAmount,
            remarks: watchedValues.remarks,
            requiresClientPresence: watchedValues.requiresClientPresence,
          };
        case 'personal':
          return watchedValues.clientInfo;
        default:
          return {};
      }
    };

    const getOriginalStepValues = () => {
      switch (currentStepKey) {
        case 'service':
          return {
            serviceType: originalValues.serviceType,
            status: originalValues.status,
            priority: originalValues.priority,
            rtoOffice: originalValues.rtoOffice,
            existingLicenseNumber: originalValues.existingLicenseNumber,
            governmentFees: originalValues.governmentFees,
            serviceCharge: originalValues.serviceCharge,
            urgentFees: originalValues.urgentFees,
            totalAmount: originalValues.totalAmount,
            remarks: originalValues.remarks,
            requiresClientPresence: originalValues.requiresClientPresence,
          };
        case 'personal':
          return originalValues.clientInfo;
        default:
          return {};
      }
    };

    const currentValues = getCurrentStepValues();
    const originalStepValues = getOriginalStepValues();

    return JSON.stringify(currentValues) !== JSON.stringify(originalStepValues);
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    form.reset(getDefaultValues());
    toast.success('Changes discarded successfully');
  };

  // Set default RTO office when it becomes available and field is empty
  useEffect(() => {
    console.log('Debug RTO Default:', {
      defaultRtoOffice,
      rtoService: !!rtoService,
      currentRtoOffice: form.getValues('rtoOffice'),
    });

    if (defaultRtoOffice && !rtoService && !form.getValues('rtoOffice')) {
      console.log('Setting default RTO office:', defaultRtoOffice);
      form.setValue('rtoOffice', defaultRtoOffice);
    }
  }, [defaultRtoOffice, rtoService, form]);

  // Step management
  const currentStepIndex = sortOrder.indexOf(externalStep);
  const isLastStep = currentStepIndex === sortOrder.length - 1;

  // Get validation fields for current step
  const getStepValidationFields = useCallback((step: StepKey): Path<RTOServiceFormData>[] => {
    switch (step) {
      case 'service':
        return [
          'serviceType',
          'rtoOffice',
          'governmentFees',
          'serviceCharge',
          'totalAmount',
        ] as Path<RTOServiceFormData>[];
      case 'personal':
        return [
          'clientInfo.firstName',
          'clientInfo.lastName',
          'clientInfo.aadhaarNumber',
          'clientInfo.phoneNumber',
          'clientInfo.address',
          'clientInfo.city',
          'clientInfo.state',
          'clientInfo.pincode',
          'clientInfo.birthDate',
          'clientInfo.gender',
        ] as Path<RTOServiceFormData>[];
      default:
        return [];
    }
  }, []);

  // Navigation functions
  const goToNext = useCallback(() => {
    const nextIndex = Math.min(currentStepIndex + 1, sortOrder.length - 1);
    setExternalStep(sortOrder[nextIndex]);
  }, [currentStepIndex, setExternalStep]);

  const goToPrevious = useCallback(() => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setExternalStep(sortOrder[prevIndex]);
  }, [currentStepIndex, setExternalStep]);

  // Handle next button
  const handleNext = useCallback(async () => {
    const fieldsToValidate = getStepValidationFields(externalStep);
    const isStepValid = await form.trigger(fieldsToValidate);

    if (!isStepValid) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    if (isLastStep) {
      // Submit the entire form
      setIsSubmitting(true);
      try {
        const formData = form.getValues();
        const result = rtoService
          ? await updateRTOService(rtoService.id, formData)
          : await addRTOService(formData);

        if (result.error) {
          toast.error(result.message);
        } else {
          toast.success(result.message);
          router.push('/rto-services');
        }
      } catch {
        toast.error('An unexpected error occurred');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      goToNext();
    }
  }, [form, externalStep, isLastStep, getStepValidationFields, goToNext, rtoService, router]);

  // Step components mapping
  const stepComponents = useMemo(
    () => ({
      service: <ServiceDetailsStep />,
      personal: <PersonalInfoStep />,
    }),
    []
  );

  return (
    <FormProvider {...form}>
      <div className="h-full flex flex-col py-10 gap-4">
        <ScrollArea className="h-[calc(100vh-320px)]">
          <form className="space-y-8 pb-24">{stepComponents[externalStep]}</form>
        </ScrollArea>

        <div className="bg-white py-4 px-6 border-t flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrevious}
            disabled={currentStepIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-3">
            {rtoService && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscardChanges}
                disabled={isSubmitting || !hasCurrentStepChanges()}
              >
                Discard Changes
              </Button>
            )}

            <Button type="button" onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving...'
                : isLastStep
                  ? rtoService
                    ? 'Update Service'
                    : 'Create Service'
                  : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
