'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export function BackButton() {
  const router = useRouter();

  return (
    <Button onClick={() => router.back()} variant="text" className="p-0">
      <ArrowLeft className="size-5 text-gray-700" />
    </Button>
  );
}
