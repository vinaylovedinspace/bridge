'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestWhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState('919876543210');
  const [message, setMessage] = useState('Hello! This is a test message from your driving school.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const sendTestMessage = async () => {
    setLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message,
        }),
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>WhatsApp Test</CardTitle>
          <CardDescription>Test WhatsApp messaging functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number (format: 91XXXXXXXXXX)
            </label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="919876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              className="w-full p-2 border rounded-md"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your test message..."
            />
          </div>

          <Button onClick={sendTestMessage} disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send Test Message'}
          </Button>

          {result && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Result:</label>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
