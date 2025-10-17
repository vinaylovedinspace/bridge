import { Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TypographyMuted } from '@/components/ui/typography';

type PhoneNumberEditorProps = {
  phoneNumber: string;
  isEditing: boolean;
  paymentMode: 'PAYMENT_LINK' | 'UPI';
  onPhoneChange: (value: string) => void;
  onSave: () => void;
  onEdit: () => void;
};

export const PhoneNumberEditor = ({
  phoneNumber,
  isEditing,
  paymentMode,
  onPhoneChange,
  onSave,
  onEdit,
}: PhoneNumberEditorProps) => {
  const linkType = paymentMode === 'UPI' ? 'UPI' : 'Payment';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <TypographyMuted>Send {linkType} Link to: </TypographyMuted>
        <Input
          value={phoneNumber}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="h-10 w-32"
          placeholder="Enter phone number"
          aria-label="Phone number"
          maxLength={10}
        />
        <Button variant="outline" onClick={onSave} className="h-10" type="button">
          Save
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Phone className="h-4 w-4 text-muted-foreground" />
      <TypographyMuted>
        Send {linkType} Link to: {phoneNumber}
      </TypographyMuted>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-8 px-2"
        type="button"
        aria-label="Edit phone number"
      >
        Edit
      </Button>
    </div>
  );
};
