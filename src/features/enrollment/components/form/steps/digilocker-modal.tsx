'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ParsedAadhaarData } from '@/types/surepass';
import { useAtomValue } from 'jotai';
import { branchConfigAtom } from '@/lib/atoms/branch-config';

type DigilockerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: ParsedAadhaarData, aadhaarPdfUrl?: string) => void;
};

type VerificationStep = 'input' | 'waiting' | 'downloading' | 'success' | 'error';

export function DigilockerModal({ open, onOpenChange, onSuccess }: DigilockerModalProps) {
  const [mobile, setMobile] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [step, setStep] = useState<VerificationStep>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const branchConfig = useAtomValue(branchConfigAtom)!;

  const resetModal = () => {
    setMobile('');
    setClientId(null);
    setStep('input');
    setErrorMessage('');
    // Clear any active polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleInitialize = async () => {
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setStep('waiting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/surepass/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          tenantId: branchConfig.tenantId,
          branchId: branchConfig.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to send SMS');
        setStep('error');
        return;
      }

      setClientId(data.client_id);
      toast.success(data.message || 'SMS sent successfully. Please authorize on your device.');

      // Start polling for status
      startStatusPolling(data.client_id);
    } catch (error) {
      console.error('Error initializing Digilocker:', error);
      setErrorMessage('Failed to send SMS. Please try again.');
      setStep('error');
    }
  };

  const checkStatus = async (client_id: string) => {
    try {
      const response = await fetch(`/api/surepass/status?client_id=${client_id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.completed && data.aadhaar_linked) {
          // Authorization completed - automatically download data
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          toast.success('Authorization completed! Downloading your Aadhaar data...');
          await handleDownload();
        } else if (data.failed) {
          // Authorization failed
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setErrorMessage('Authorization failed. Please try again.');
          setStep('error');
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const startStatusPolling = (client_id: string) => {
    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      checkStatus(client_id);
    }, 3000);

    // Stop polling after 5 minutes (timeout)
    setTimeout(
      () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      },
      5 * 60 * 1000
    );
  };

  const handleDownload = async () => {
    if (!clientId) {
      toast.error('Client ID not available. Please restart the process.');
      return;
    }

    setStep('downloading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/surepass/download-aadhaar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.error ||
            'Failed to download Aadhaar data. Please ensure you have authorized Digilocker access.'
        );
        setStep('error');
        return;
      }

      setStep('success');
      toast.success('Aadhaar data retrieved successfully!');

      // Wait a moment before closing to show success state
      setTimeout(() => {
        onSuccess(result.data, result.aadhaarPdfUrl);
        onOpenChange(false);
        resetModal();
      }, 1500);
    } catch (error) {
      console.error('Error downloading Aadhaar data:', error);
      setErrorMessage('Failed to download Aadhaar data. Please try again.');
      setStep('error');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetModal();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto-fill via Digilocker</DialogTitle>
          <DialogDescription>
            Verify your Aadhaar through Digilocker to automatically fill personal details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'input' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mobile">Aadhaar Registered Mobile Number</Label>
                <Input
                  id="mobile"
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  autoFocus
                />
              </div>
              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                <Smartphone className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>
                  You will receive an SMS with a link to authorize Digilocker access. Click the link
                  and complete the authorization on your mobile device.
                </p>
              </div>
            </>
          )}

          {step === 'waiting' && (
            <div className="space-y-4 py-8 text-center">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Waiting for Authorization...</h3>
                <p className="text-sm text-muted-foreground">
                  Please check your mobile device for the authorization link and complete the
                  Digilocker authorization.
                </p>
                <p className="text-sm text-muted-foreground">
                  We'll automatically download your Aadhaar details once you authorize.
                </p>
              </div>
            </div>
          )}

          {step === 'downloading' && (
            <div className="space-y-4 py-8 text-center">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Downloading Aadhaar Data...</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while we retrieve your information.
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4 py-8 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">Success!</h3>
                <p className="text-sm text-muted-foreground">
                  Your Aadhaar data has been retrieved successfully.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-900">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleInitialize}>Send SMS</Button>
            </>
          )}

          {step === 'waiting' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleDownload}>Download Now</Button>
            </>
          )}

          {step === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep('input')}>Try Again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
