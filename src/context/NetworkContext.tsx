// src/context/NetworkContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  retryConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [connectionType, setConnectionType] = useState<string | null>('wifi');

  useEffect(() => {
    // Get initial network state
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const retryConnection = async () => {
    try {
      const state = await NetInfo.refresh();
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable);
      setConnectionType(state.type);
    } catch (error) {
      console.error('Failed to refresh network state:', error);
    }
  };

  const value: NetworkContextType = {
    isConnected,
    isInternetReachable,
    connectionType,
    retryConnection,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};