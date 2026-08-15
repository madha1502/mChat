import { create } from 'zustand';
import { api } from '../services/api';
import { IWhatsAppIntegration } from '../types';

interface WhatsAppState {
  integration: IWhatsAppIntegration | null;
  isLoading: boolean;
  isConnectOpen: boolean;
  isSimulatorOpen: boolean;

  // Actions
  fetchIntegration: () => Promise<void>;
  connectAccount: (data: {
    businessAccountId?: string;
    phoneNumberId?: string;
    displayPhoneNumber: string;
    accessToken?: string;
    webhookSecret?: string;
  }) => Promise<void>;
  disconnectAccount: () => Promise<void>;
  simulateInboundMessage: (data: {
    customerPhone: string;
    customerName: string;
    content: string;
    messageType?: string;
  }) => Promise<void>;

  openConnect: () => void;
  closeConnect: () => void;
  openSimulator: () => void;
  closeSimulator: () => void;
}

export const useWhatsAppStore = create<WhatsAppState>((set, get) => ({
  integration: null,
  isLoading: false,
  isConnectOpen: false,
  isSimulatorOpen: false,

  fetchIntegration: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/integrations/whatsapp');
      if (res.data.success) {
        set({ integration: res.data.data, isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  connectAccount: async (data) => {
    try {
      set({ isLoading: true });
      const res = await api.post('/integrations/whatsapp/connect', data);
      if (res.data.success) {
        set({ integration: res.data.data, isLoading: false, isConnectOpen: false });
      }
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.message || 'Failed to link WhatsApp Business account');
    }
  },

  disconnectAccount: async () => {
    try {
      set({ isLoading: true });
      await api.post('/integrations/whatsapp/disconnect');
      set({ integration: null, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.message || 'Failed to disconnect WhatsApp account');
    }
  },

  simulateInboundMessage: async (data) => {
    try {
      await api.post('/integrations/whatsapp/simulate', data);
      await get().fetchIntegration();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to trigger simulated message');
    }
  },

  openConnect: () => set({ isConnectOpen: true }),
  closeConnect: () => set({ isConnectOpen: false }),
  openSimulator: () => set({ isSimulatorOpen: true }),
  closeSimulator: () => set({ isSimulatorOpen: false }),
}));
