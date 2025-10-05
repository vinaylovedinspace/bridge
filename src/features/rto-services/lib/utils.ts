import { Path } from 'react-hook-form';
import { RTOServiceFormValues } from '../types';
import { generateFieldPaths } from '@/lib/utils';

// Function to get validation fields for a specific step
export const getMultistepRTOServiceStepValidationFields = (
  step: string,
  getValues: (key: string) => unknown
): Path<RTOServiceFormValues>[] => {
  switch (step) {
    case 'personal':
      return generateFieldPaths<RTOServiceFormValues>({
        prefix: 'personalInfo',
        getValues,
      });
    case 'license':
      return generateFieldPaths<RTOServiceFormValues>({
        prefix: 'service',
        getValues,
      });
    default:
      return [];
  }
};
