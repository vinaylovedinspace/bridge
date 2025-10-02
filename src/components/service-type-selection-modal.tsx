'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GraduationCap, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ServiceType = 'FULL_SERVICE' | 'DRIVING_ONLY';

interface ServiceTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceTypeSelectionModal = ({ isOpen, onClose }: ServiceTypeSelectionModalProps) => {
  const router = useRouter();

  const handleServiceTypeSelect = (serviceType: ServiceType) => {
    // Store the selected service type in sessionStorage for the admission flow
    sessionStorage.setItem('selectedServiceType', serviceType);

    // Navigate to admission with the service type
    router.push('/admission');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Choose Your Service Type</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Service Option */}
            <div
              className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleServiceTypeSelect('FULL_SERVICE')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <GraduationCap className="w-8 h-8 text-blue-600" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Service Package</h3>
                  <ul className="text-sm text-gray-600 space-y-2 text-left">
                    <li>• We handle your licence applications</li>
                    <li>• Learner&apos;s → Driving licence process</li>
                    <li>• Professional driving training</li>
                    <li>• Documentation support</li>
                    <li>• End-to-end service</li>
                  </ul>
                </div>

                <Button className="w-full" variant="default">
                  Select Full Service
                </Button>
              </div>
            </div>

            {/* Driving Only Option */}
            <div
              className="border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleServiceTypeSelect('DRIVING_ONLY')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Car className="w-8 h-8 text-green-600" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Driving Training Only
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-2 text-left">
                    <li>• Professional driving lessons</li>
                    <li>• You manage your own licences</li>
                    <li>• Perfect for existing licence holders</li>
                    <li>• Flexible training schedule</li>
                    <li>• Cost-effective option</li>
                  </ul>
                </div>

                <Button className="w-full" variant="outline">
                  Select Driving Only
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>You can modify your service preferences during the admission process if needed.</p>
          </div>

          <div className="flex justify-center pt-4 border-t">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
