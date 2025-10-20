import { BackButton } from '@/components/back-button';
import { TypographyH4 } from '@/components/ui/typography';

export default function AddEnrollmentayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-10">
      <div className="flex gap-4 items-center">
        <BackButton />
        <TypographyH4>Admission Form</TypographyH4>
      </div>
      {children}
    </div>
  );
}
