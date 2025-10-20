import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TypographyMuted } from '@/components/ui/typography';
import Image from 'next/image';

type QRModalProps = {
  showQrModal: boolean;
  setShowQrModal: (show: boolean) => void;
  qrCode: string | null;
  expiryTime: string | null;
};

export const QRModal = ({ showQrModal, setShowQrModal, qrCode, expiryTime }: QRModalProps) => {
  return (
    <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment QR Code</DialogTitle>
          <DialogDescription>
            {expiryTime && `Expires: ${new Date(expiryTime).toLocaleDateString()}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {qrCode && (
            <Image
              src={qrCode}
              alt="Payment QR Code"
              width={300}
              height={300}
              className="border rounded-lg"
            />
          )}
          <TypographyMuted className="text-center">
            Scan this QR code to complete payment
          </TypographyMuted>
        </div>
      </DialogContent>
    </Dialog>
  );
};
