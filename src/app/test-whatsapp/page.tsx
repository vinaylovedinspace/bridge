'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TestWhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testType, setTestType] = useState('simple');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ error?: string } | null>(null);

  const handleTest = async () => {
    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/webhooks/test-whatsapp-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          testType,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: 'Failed to run test' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Integration Test</CardTitle>
          <CardDescription>
            Test your WhatsApp integration with different message types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              placeholder="9876543210 or 919876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Enter 10-digit Indian number (9876543210) or with country code (919876543210)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Test Type</label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple Message</SelectItem>
                <SelectItem value="onboarding">Onboarding Message</SelectItem>
                <SelectItem value="payment">Payment Message</SelectItem>
                <SelectItem value="payment-receipt">Payment Receipt</SelectItem>
                <SelectItem value="combined-onboarding-receipt">
                  Combined Onboarding + Receipt
                </SelectItem>
                <SelectItem value="comprehensive-onboarding">Comprehensive Onboarding</SelectItem>
                <SelectItem value="service-onboarding">Full Onboarding Service</SelectItem>
                <SelectItem value="service-payment">Full Payment Service</SelectItem>
                <SelectItem value="service-payment-receipt">
                  Enhanced Payment Receipt Service
                </SelectItem>
                <SelectItem value="service-onboarding-with-receipt">
                  Combined Onboarding + Receipt Service
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleTest} disabled={loading || !phoneNumber} className="w-full">
            {loading ? 'Sending...' : 'Send Test Message'}
          </Button>

          {result && (
            <div className="mt-4 p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Test Result:</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
