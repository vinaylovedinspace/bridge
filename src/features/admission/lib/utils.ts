import { Path } from 'react-hook-form';
import { AdmissionFormValues } from '../types';

// Helper function to generate field paths from type
const generateFieldPaths = ({
  prefix,
  excludeFields = [],
  getValues,
}: {
  prefix: keyof AdmissionFormValues;
  excludeFields?: string[];
  getValues: (key: string) => unknown;
}): Path<AdmissionFormValues>[] => {
  // Get the value for the specified prefix and safely handle undefined
  const value = getValues(prefix);
  const fields = value ? Object.keys(value) : [];

  return fields
    .filter((field) => !excludeFields.includes(field))
    .map((field) => `${String(prefix)}.${field}` as Path<AdmissionFormValues>);
};

// Function to get validation fields for a specific step
export const getMultistepAdmissionStepValidationFields = (
  step: string,
  getValues: (key: string) => unknown
): Path<AdmissionFormValues>[] => {
  switch (step) {
    case 'service':
      return ['personalInfo.serviceType'];
    case 'personal':
      return generateFieldPaths({
        prefix: 'personalInfo',
        getValues,
      });
    case 'license':
      return [
        ...generateFieldPaths({
          prefix: 'learningLicense',
          getValues,
        }),
        ...generateFieldPaths({
          prefix: 'learningLicense',
          getValues,
        }),
      ];
    case 'plan':
      return generateFieldPaths({
        prefix: 'plan',
        getValues,
      });
    case 'payment':
      return generateFieldPaths({
        prefix: 'payment',
        getValues,
      });
    default:
      return [];
  }
};
