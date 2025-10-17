import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TypographyH5 } from '@/components/ui/typography';

type SessionDetailsProps = {
  disabled?: boolean;
};

export const SessionDetails = ({ disabled = false }: SessionDetailsProps) => {
  const { control } = useFormContext<AdmissionFormValues>();

  return (
    <div className="grid grid-cols-12">
      <TypographyH5 className="col-span-3">Session Details</TypographyH5>
      <div className="grid grid-cols-3 col-span-9 gap-6">
        <FormField
          control={control}
          name="plan.numberOfSessions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Sessions*</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Number of sessions"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="plan.sessionDurationInMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Duration (minutes)*</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Duration in minutes"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
