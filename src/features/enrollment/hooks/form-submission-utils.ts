import { ActionReturnType } from '@/types/actions';

/**
 * Validate that an object has meaningful data (not just empty object)
 */
export const hasValidData = (obj: Record<string, unknown> | undefined): boolean => {
  if (!obj) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;

  // Check if at least one property has a truthy value (excluding clientId which is added later)
  return keys.some((key) => {
    if (key === 'client.id') return false;
    const value = obj[key];
    // Allow false boolean values, but not undefined/null/empty string
    return value !== undefined && value !== null && value !== '';
  });
};

/**
 * Shared license result message generator
 */
export const getLicenseSuccessMessage = (
  hasLearning: boolean,
  hasDriving: boolean,
  mode: 'create' | 'update' = 'create'
): string => {
  const action = mode === 'create' ? 'saved' : 'updated';

  if (hasLearning && hasDriving) {
    return `Learning and driving licence information ${action} successfully`;
  } else if (hasLearning) {
    return `Learning licence information ${action} successfully`;
  } else if (hasDriving) {
    return `Driving licence information ${action} successfully`;
  }

  return `Licence step completed`;
};

/**
 * Generic error handler for step submissions
 */
export const handleStepError = (error: unknown, stepName: string) => {
  console.error(`Error processing ${stepName} step:`, error);
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  return {
    error: true,
    message: `Failed to process ${stepName} data: ${errorMessage}`,
  };
};
