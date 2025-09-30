import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVehicles } from '@/hooks/vehicles';
import { TypographyH5 } from '@/components/ui/typography';

const VehicleOptions = () => {
  const { data: vehicles, isLoading } = useVehicles();

  if (isLoading) {
    return <div className="p-2 text-sm text-muted-foreground text-center">Loading vehicles...</div>;
  }

  if (vehicles?.length === 0) {
    return <div className="p-2 text-sm text-muted-foreground text-center">No vehicles found</div>;
  }

  return vehicles?.map((vehicle) => (
    <SelectItem key={vehicle.id} value={vehicle.id}>
      {vehicle.name}
    </SelectItem>
  ));
};

export const VehicleSelection = () => {
  const { control } = useFormContext<AdmissionFormValues>();

  return (
    <div className="grid grid-cols-12">
      <TypographyH5 className="col-span-3">Vehicle</TypographyH5>
      <div className="grid grid-cols-3 col-span-9 gap-6">
        <FormField
          control={control}
          name="plan.vehicleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Vehicle</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <VehicleOptions />
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
