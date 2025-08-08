'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { TypographyP } from '@/components/ui/typography';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

import { addStaff, updateStaff } from '../server/action';
import { staffFormSchema } from '../schemas/staff';
import { Staff } from '@/server/db/staff';
import { useRouter } from 'next/navigation';
import { getVehicles } from '@/server/actions/vehicle';
import { getStaff } from '@/server/actions/staff';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Vehicle = {
  id: string;
  name: string;
  number: string;
};

export function StaffForm({ staff }: { staff?: Staff }) {
  const form = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      firstName: staff?.firstName || '',
      lastName: staff?.lastName || '',
      photo: staff?.photo || '',
      staffRole: staff?.staffRole || 'instructor',
      clerkRole: staff?.clerkRole || 'member',
      assignedVehicleId: staff?.assignedVehicleId || 'none',
      licenseNumber: staff?.licenseNumber || '',
      licenseIssueDate: staff?.licenseIssueDate || undefined,
      experienceYears: staff?.experienceYears || '',
      educationLevel: staff?.educationLevel || '',
      phone: staff?.phone || '',
    },
  });

  const [isPending, setIsPending] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [conflictingStaff, setConflictingStaff] = useState<Staff | null>(null);
  const [pendingVehicleId, setPendingVehicleId] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(staff?.photo || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const router = useRouter();

  const staffRole = form.watch('staffRole');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehicleData, staffData] = await Promise.all([getVehicles(), getStaff()]);
        setVehicles(vehicleData);
        setAllStaff(staffData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  // Reset vehicle assignment and instructor fields when staff role changes
  useEffect(() => {
    if (staffRole !== 'instructor') {
      form.setValue('assignedVehicleId', 'none');
      // Clear instructor-specific fields when not an instructor
      form.setValue('licenseNumber', '');
      form.setValue('licenseIssueDate', undefined);
      form.setValue('experienceYears', '');
      form.setValue('educationLevel', '');
      form.setValue('phone', '');
    } else {
      // If changing to instructor and currently "none", clear the value to show validation
      if (form.getValues('assignedVehicleId') === 'none') {
        form.setValue('assignedVehicleId', '');
      }
    }
  }, [staffRole, form]);

  const handleVehicleChange = (vehicleId: string) => {
    // For non-instructors, allow "none" value
    if (vehicleId === 'none' && staffRole !== 'instructor') {
      form.setValue('assignedVehicleId', vehicleId);
      return;
    }

    // Check if this vehicle is already assigned to another staff member
    const conflictingStaffMember = allStaff.find(
      (s) => s.assignedVehicleId === vehicleId && s.id !== staff?.id
    );

    if (conflictingStaffMember) {
      setConflictingStaff(conflictingStaffMember);
      setPendingVehicleId(vehicleId);
      setShowVehicleDialog(true);
    } else {
      form.setValue('assignedVehicleId', vehicleId);
    }
  };

  const handleVehicleReassignment = () => {
    form.setValue('assignedVehicleId', pendingVehicleId);
    setShowVehicleDialog(false);
    setConflictingStaff(null);
    setPendingVehicleId('');
  };

  const handleVehicleDialogCancel = () => {
    setShowVehicleDialog(false);
    setConflictingStaff(null);
    setPendingVehicleId('');
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (1MB limit)
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Photo size must be less than 1MB');
      // Reset the input
      event.target.value = '';
      return;
    }

    setPhotoFile(file);

    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const { url } = await response.json();
      return url;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  async function onSubmit(values: z.infer<typeof staffFormSchema>) {
    setIsPending(true);
    try {
      let result;
      let photoUrl = values.photo;

      // Upload photo if a new file was selected
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      // Convert "none" back to undefined for assignedVehicleId
      const processedValues = {
        ...values,
        photo: photoUrl,
        assignedVehicleId:
          values.assignedVehicleId === 'none' ? undefined : values.assignedVehicleId,
      };

      // Check if we need to handle vehicle reassignment
      const vehicleId = processedValues.assignedVehicleId;
      if (vehicleId) {
        const conflictingStaffMember = allStaff.find(
          (s) => s.assignedVehicleId === vehicleId && s.id !== staff?.id
        );

        if (conflictingStaffMember) {
          // First, remove vehicle from the conflicting staff member
          await updateStaff(conflictingStaffMember.id, {
            firstName: conflictingStaffMember.firstName,
            lastName: conflictingStaffMember.lastName,
            photo: conflictingStaffMember.photo || undefined,
            staffRole: conflictingStaffMember.staffRole,
            clerkRole: conflictingStaffMember.clerkRole,
            assignedVehicleId: undefined,
          });
        }
      }

      if (staff?.id) {
        // Update existing staff
        result = await updateStaff(staff.id, processedValues);
      } else {
        // Create new staff
        result = await addStaff(processedValues);
      }

      if (result.error) {
        toast.error(result.message || 'Failed to process staff data');
      } else {
        toast.success(result.message);
        if (!staff?.id) {
          form.reset();
          router.push('/staff');
        }
      }
    } catch (error) {
      console.log(error);
      toast.error('Something went wrong');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-[60rem]">
        <div className="grid grid-cols-12 w-full">
          <TypographyP className="col-span-3 font-medium">Personal Details</TypographyP>

          <div className="col-span-9 gap-6 w-full grid grid-cols-12">
            <div className="col-span-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-6">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-12 space-y-4">
              <Label>Photo (Optional)</Label>
              <div className="flex items-center space-x-4 max">
                {photoPreview && (
                  <div className="w-16 h-16 rounded-full overflow-hidden border">
                    <Image
                      src={photoPreview}
                      alt="Preview"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload a photo (JPG, PNG, etc.) - Maximum size 1MB
                  </p>
                </div>
              </div>
              {/* Hidden field for form validation */}
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => <Input type="hidden" {...field} value={photoPreview} />}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 w-full">
          <TypographyP className="col-span-3 font-medium">Role Details</TypographyP>

          <div className="col-span-9 gap-6 w-full grid grid-cols-12">
            <div className="col-span-4">
              <FormField
                control={form.control}
                name="staffRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Staff Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="col-span-4">
              <FormField
                control={form.control}
                name="clerkRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Access Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select clerk role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {staffRole === 'instructor' && (
          <div className="grid grid-cols-12 w-full">
            <TypographyP className="col-span-3 font-medium">Vehicle Assignment</TypographyP>

            <div className="col-span-9 gap-6 w-full grid grid-cols-12">
              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="assignedVehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Assigned Vehicle</FormLabel>
                      <Select onValueChange={handleVehicleChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No vehicles found
                            </div>
                          ) : (
                            vehicles.map((vehicle) => {
                              const isAssigned = allStaff.some(
                                (s) => s.assignedVehicleId === vehicle.id && s.id !== staff?.id
                              );
                              return (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  {vehicle.name} - {vehicle.number}
                                  {isAssigned && (
                                    <span className="text-orange-500 ml-2">(Assigned)</span>
                                  )}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {staffRole === 'instructor' && (
          <div className="grid grid-cols-12 w-full">
            <TypographyP className="col-span-3 font-medium">Instructor Details</TypographyP>

            <div className="col-span-9 gap-6 w-full grid grid-cols-12">
              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter license number" type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="licenseIssueDate"
                  render={() => (
                    <FormItem>
                      <FormLabel required>License Issue Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          name="licenseIssueDate"
                          control={form.control}
                          placeholderText="Select issue date"
                          maxDate={new Date()}
                          minDate={new Date('1980-01-01')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Experience Years</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 5" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Education Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select education level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="below_10th">Below 10th</SelectItem>
                          <SelectItem value="10th_pass">10th Pass</SelectItem>
                          <SelectItem value="12th_pass">12th Pass</SelectItem>
                          <SelectItem value="diploma">Diploma</SelectItem>
                          <SelectItem value="graduate">Graduate</SelectItem>
                          <SelectItem value="post_graduate">Post Graduate</SelectItem>
                          <SelectItem value="others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>WhatsApp Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +919876543210" type="tel" {...field} />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        This number will be used to send WhatsApp messages to the instructor
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        <Button type="submit" disabled={isPending || isUploadingPhoto}>
          {isUploadingPhoto
            ? 'Uploading photo...'
            : isPending
              ? 'Submitting...'
              : staff?.id
                ? 'Update'
                : 'Submit'}
        </Button>
      </form>

      <AlertDialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vehicle Already Assigned</AlertDialogTitle>
            <AlertDialogDescription>
              The selected vehicle is currently assigned to{' '}
              <strong>
                {conflictingStaff?.firstName} {conflictingStaff?.lastName}
              </strong>
              . Do you want to reassign this vehicle to the current staff member? This will remove
              the vehicle assignment from the previous instructor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleVehicleDialogCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVehicleReassignment}>
              Reassign Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
