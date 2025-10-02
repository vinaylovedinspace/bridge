'use client';

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

type DuplicateClientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  matchedField?: 'phone' | 'aadhaar';
  onUseExisting: () => void;
  onContinueWithNew: () => void;
};

export const DuplicateClientModal = ({
  open,
  onOpenChange,
  clientName,
  matchedField = 'phone',

  onUseExisting,
  onContinueWithNew,
}: DuplicateClientModalProps) => {
  const fieldLabel = matchedField === 'phone' ? 'Phone Number' : 'Aadhaar Number';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{fieldLabel} Already Exists</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <div>
                This {fieldLabel.toLowerCase()} is already registered for{' '}
                <strong>{clientName}</strong>.
              </div>

              <div className="mt-2">
                Would you like to use the existing client or continue with updating their
                information?
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onContinueWithNew}>Continue with Update</AlertDialogCancel>
          <AlertDialogAction onClick={onUseExisting}>Use Existing Client</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
