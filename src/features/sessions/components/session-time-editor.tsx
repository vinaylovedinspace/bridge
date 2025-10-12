'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Session } from '@/server/db/sessions';
import { formatTimeString } from '@/lib/date-time-utils';

interface SessionTimeEditorProps {
  session: Session | null;
  sessions?: Session[];
  open: boolean;
  onSave: (sessionId: string, newStartTime: string, newEndTime: string) => Promise<void>;
  onCancel: () => void;
}

const generateTimeOptions = () => {
  const times = [];
  for (let hour = 6; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

const calculateEndTime = (startTime: string, durationMinutes: number = 30): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return formatTimeString(endDate);
};

export const SessionTimeEditor = ({
  session,
  sessions = [],
  open,
  onSave,
  onCancel,
}: SessionTimeEditorProps) => {
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(30); // Default 30 minutes
  const [isLoading, setIsLoading] = useState(false);
  const [conflictError, setConflictError] = useState('');

  const timeOptions = generateTimeOptions();
  const endTime = startTime ? calculateEndTime(startTime, duration) : '';

  // Check for time slot conflicts
  const checkTimeConflict = (newStartTime: string, newEndTime: string) => {
    if (!session) return null;

    const sessionDate = session.sessionDate;

    // Find other sessions on the same date (excluding the current session being edited)
    const conflictingSessions = sessions.filter(
      (s) => s.id !== session.id && s.sessionDate === sessionDate && s.status !== 'CANCELLED'
    );

    // Check for time overlap
    for (const otherSession of conflictingSessions) {
      const otherStart = otherSession.startTime.substring(0, 5); // Convert HH:MM:SS to HH:MM
      const otherEnd = otherSession.endTime.substring(0, 5); // Convert HH:MM:SS to HH:MM

      // Check if times overlap
      if (newStartTime < otherEnd && newEndTime > otherStart) {
        return otherSession;
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (!session) return;

    // Check for conflicts before saving
    const conflictingSession = checkTimeConflict(startTime, endTime);
    if (conflictingSession) {
      setConflictError(
        `This time slot conflicts with ${conflictingSession.clientName}'s session (${conflictingSession.startTime.substring(0, 5)} - ${conflictingSession.endTime.substring(0, 5)})`
      );
      return;
    }

    setIsLoading(true);
    try {
      await onSave(session.id, startTime, endTime);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when time or duration changes
  useEffect(() => {
    setConflictError('');
  }, [startTime, duration]);

  // Reset form when session changes or modal opens
  useEffect(() => {
    if (session && open) {
      console.log('Setting start time to:', session.startTime);
      // Handle both HH:MM and HH:MM:SS formats
      const formattedStartTime = session.startTime.includes(':')
        ? session.startTime.substring(0, 5) // Take only HH:MM part
        : session.startTime;
      setStartTime(formattedStartTime);
      setConflictError('');
    }
  }, [session, open]);

  console.log('Current startTime state:', startTime);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-96 max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>Edit Session Time</DialogTitle>
        </DialogHeader>

        {session && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <p className="text-sm text-gray-600">{session.clientName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <Select
                value={duration.toString()}
                onValueChange={(value) => setDuration(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Time</label>
              <p className="text-sm text-gray-600">
                {endTime
                  ? new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '--'}
              </p>
            </div>

            {conflictError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600 font-medium">⚠️ Time Slot Conflict</p>
                <p className="text-sm text-red-600 mt-1">{conflictError}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isLoading || !!conflictError}
            isLoading={isLoading}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
