import { z } from 'zod';

// Define the branch schema first
const branchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
});

// Form schema for validation
export const onboardingFormSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  schoolWhatsappNumber: z.string().min(10, 'WhatsApp number must be at least 10 characters'),
  branches: z
    .array(branchSchema)
    .min(1, 'At least one branch is required')
    .superRefine((branches, ctx) => {
      // Track branch names that have been seen
      const seenNames = new Map<string, number>();

      // Check each branch name
      branches.forEach((branch, index) => {
        const normalizedName = branch.name.trim().toLowerCase();

        if (normalizedName) {
          if (seenNames.has(normalizedName)) {
            // Add error at the specific branch index that is a duplicate
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Branch name must be unique',
              path: [index, 'name'], // This targets the specific branch.name field
            });
          } else {
            seenNames.set(normalizedName, index);
          }
        }
      });
    }),
});

// Type for our form values
export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

// Define the step configuration with components
export type StepKey = 'school-name' | 'school-whatsapp' | 'branches';

export type BranchField = {
  id: number;
  name: string;
};
