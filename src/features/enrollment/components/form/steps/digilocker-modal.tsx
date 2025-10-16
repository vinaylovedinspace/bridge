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
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ParsedAadhaarData } from '@/types/surepass';
import { useAtomValue } from 'jotai';
import { branchConfigAtom } from '@/lib/atoms/branch-config';
import {
  initializeDigilocker,
  checkDigilockerStatus,
  downloadAadhaarData,
} from '@/features/enrollment/server/digilocker-actions';

type DigilockerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: ParsedAadhaarData, aadhaarPdfUrl?: string) => void;
};

type VerificationStep = 'input' | 'waiting' | 'downloading' | 'success' | 'error';

export function DigilockerModal({ open, onOpenChange, onSuccess }: DigilockerModalProps) {
  const branchConfig = useAtomValue(branchConfigAtom)!;
  const [mobile, setMobile] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [step, setStep] = useState<VerificationStep>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [flowType, setFlowType] = useState<'manager' | 'client'>(
    branchConfig.digilockerFlowPreference || 'manager'
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetModal = () => {
    setMobile('');
    setClientId(null);
    setStep('input');
    setErrorMessage('');
    setFlowType(branchConfig.digilockerFlowPreference || 'manager');
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

    // For manager mode, open a blank window immediately to avoid popup blocker
    let newWindow: Window | null = null;
    if (flowType === 'manager') {
      newWindow = window.open('about:blank', '_blank');
    }

    setStep('waiting');
    setErrorMessage('');

    try {
      const result = await initializeDigilocker({
        sendSMS: flowType === 'client',
        mobile,
        tenantId: branchConfig.tenantId,
        branchId: branchConfig.id,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to initialize Digilocker');
        setStep('error');
        // Close the blank window if it was opened
        if (newWindow) {
          newWindow.close();
        }
        return;
      }

      setClientId(result.client_id!);

      // For manager mode, navigate the opened window to Digilocker URL
      if (flowType === 'manager' && result.url) {
        if (newWindow) {
          newWindow.location.href = result.url;
        }
        toast.success('Digilocker opened in new tab. Please complete the authorization.');
      } else {
        // For client mode, show SMS sent message
        toast.success(result.message || 'SMS sent successfully. Please authorize on your device.');
      }

      // Start polling for status (both modes)
      startStatusPolling(result.client_id!);
    } catch (error) {
      console.error('Error initializing Digilocker:', error);
      setErrorMessage('Failed to initialize Digilocker. Please try again.');
      setStep('error');
      // Close the blank window if it was opened
      if (newWindow) {
        newWindow.close();
      }
    }
  };

  const checkStatus = async (client_id: string) => {
    try {
      const result = await checkDigilockerStatus(client_id);

      if (result.success) {
        if (result.completed) {
          // Authorization completed - automatically download data
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          toast.success('Authorization completed! Downloading your Aadhaar data...');
          await handleDownload(client_id);
        } else if (result.failed) {
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

  const handleDownload = async (clientId: string) => {
    setStep('downloading');
    setErrorMessage('');

    try {
      const result = await downloadAadhaarData(clientId);

      if (!result.success) {
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
        onSuccess(result.data!);
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
            Verify Aadhaar through Digilocker to automatically fill personal details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'input' && (
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
          )}

          {step === 'waiting' && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="font-semibold">Waiting for Authorization...</h3>
                <p className="text-sm text-muted-foreground">
                  {flowType === 'manager'
                    ? 'Please complete the Digilocker authorization in the opened tab.'
                    : 'Please ask the client to check their mobile device for the SMS and complete the Digilocker authorization.'}
                </p>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll automatically download the Aadhaar details once authorized.
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
              <Button onClick={handleInitialize}>
                {flowType === 'manager' ? 'Open Digilocker' : 'Send SMS'}
              </Button>
            </>
          )}

          {step === 'waiting' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
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
