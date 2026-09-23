import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client } from '../types';
import { api } from '../api';

interface ClientContextType {
  clients: Client[];
  selectedClientId: string; // 'ALL' or specific client ID
  selectedClient: Client | null;
  setSelectedClientId: (id: string) => void;
  refreshClients: () => Promise<void>;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const selectedClient = selectedClientId !== 'ALL'
    ? clients.find((c) => c.id === selectedClientId) || null
    : null;

  return (
    <ClientContext.Provider
      value={{
        clients,
        selectedClientId,
        selectedClient,
        setSelectedClientId,
        refreshClients: fetchClients,
        isLoading,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClients must be used within a ClientProvider');
  return ctx;
};
