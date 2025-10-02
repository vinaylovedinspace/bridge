import { z } from 'zod';

export const staffFormSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    photo: z.string().url().optional().or(z.literal('')),
    staffRole: z.enum(['instructor', 'manager', 'accountant'], {
      required_error: 'Staff role is required',
    }),
    clerkRole: z.enum(['admin', 'member'], {
      required_error: 'Clerk role is required',
    }),
    assignedVehicleId: z.string().optional(),

    // Instructor-specific fields
    licenseNumber: z.string().optional(),
    licenseIssueDate: z.date().optional(),
    experienceYears: z.string().optional(),
    educationLevel: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => {
      // If staff role is instructor, assignedVehicleId is required and cannot be "none"
      if (data.staffRole === 'instructor') {
        return data.assignedVehicleId && data.assignedVehicleId !== 'none';
      }
      return true;
    },
    {
      message: 'Vehicle assignment is required for instructors',
      path: ['assignedVehicleId'],
    }
  )
  .refine(
    (data) => {
      // If staff role is instructor, all instructor fields are required
      if (data.staffRole === 'instructor') {
        return data.licenseNumber && data.licenseNumber.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Licence number is required for instructors',
      path: ['licenseNumber'],
    }
  )
  .refine(
    (data) => {
      // If staff role is instructor, license issue date is required
      if (data.staffRole === 'instructor') {
        return data.licenseIssueDate;
      }
      return true;
    },
    {
      message: 'Licence issue date is required for instructors',
      path: ['licenseIssueDate'],
    }
  )
  .refine(
    (data) => {
      // If staff role is instructor, experience years is required
      if (data.staffRole === 'instructor') {
        return data.experienceYears && data.experienceYears.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Experience years is required for instructors',
      path: ['experienceYears'],
    }
  )
  .refine(
    (data) => {
      // If staff role is instructor, education level is required
      if (data.staffRole === 'instructor') {
        return data.educationLevel && data.educationLevel.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Education level is required for instructors',
      path: ['educationLevel'],
    }
  )
  .refine(
    (data) => {
      // If staff role is instructor, phone is required and must be valid Indian phone format
      if (data.staffRole === 'instructor') {
        if (!data.phone || data.phone.trim().length === 0) {
          return false;
        }
        // Accepts: 9876543210, +919876543210
        const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
        return phoneRegex.test(data.phone.trim());
      }
      return true;
    },
    {
      message: 'Valid Indian phone number is required for instructors (e.g., 9876543210)',
      path: ['phone'],
    }
  );
