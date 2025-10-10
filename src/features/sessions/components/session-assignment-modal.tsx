'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, User } from 'lucide-react';
import { getClientsWithUnassignedSessions } from '@/server/action/clients';
import type { ClientWithUnassignedSessions } from '@/server/db/client';

interface SessionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (clientId: string) => void;
  timeSlot: string;
  date: Date;
}

export const SessionAssignmentModal = ({
  isOpen,
  onClose,
  onAssign,
  timeSlot,
  date,
}: SessionAssignmentModalProps) => {
  const [clients, setClients] = useState<ClientWithUnassignedSessions[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithUnassignedSessions[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phoneNumber.includes(searchTerm)
    );
    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      // Force fresh data by bypassing cache
      const clientsData = await getClientsWithUnassignedSessions();
      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSelect = (client: ClientWithUnassignedSessions) => {
    onAssign(client.id);
  };

  // TODO: Make sure we don't how more than 3 users in the assign session modal
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-96 max-w-[90vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Session</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Time:</strong> {timeSlot}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Date:</strong> {date.toLocaleDateString()}
          </p>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              {clients.length === 0
                ? 'No clients with unassigned sessions found'
                : 'No clients match your search'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.phoneNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
