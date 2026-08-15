import { create } from 'zustand';
import { api } from '../services/api';
import { IUser, IPrivacySettings } from '../types';
import { socketService } from '../services/socketService';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // OTP State
  isOtpStep: boolean;
  otpPendingEmail: string | null;
  otpPurpose: 'register' | 'login' | null;
  pendingRegisterData: any | null;

  // Actions
  initializeAuth: () => Promise<void>;
  sendOtp: (email: string, purpose: 'register' | 'login', name?: string) => Promise<void>;
  initiateLogin: (identifier: string, password: string) => Promise<void>;
  completeLoginWithOtp: (email: string, otp: string) => Promise<void>;
  initiateRegister: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    profilePicture?: string;
    about?: string;
  }) => Promise<void>;
  completeRegisterWithOtp: (otp: string) => Promise<void>;
  cancelOtp: () => void;
  clearError: () => void;

  login: (identifier: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  updateProfile: (data: Partial<IUser>) => Promise<void>;
  updatePrivacy: (privacy: IPrivacySettings) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('aether_token'),
  isLoading: false,
  isInitialized: false,
  error: null,

  isOtpStep: false,
  otpPendingEmail: null,
  otpPurpose: null,
  pendingRegisterData: null,

  clearError: () => set({ error: null }),
  cancelOtp: () =>
    set({
      isOtpStep: false,
      otpPendingEmail: null,
      otpPurpose: null,
      pendingRegisterData: null,
      error: null,
    }),

  initializeAuth: async () => {
    const token = localStorage.getItem('aether_token');
    if (!token) {
      set({ isInitialized: true, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data.user) {
        set({ user: res.data.data.user, token, isInitialized: true, isLoading: false });
        socketService.connect(token);
      } else {
        localStorage.removeItem('aether_token');
        set({ user: null, token: null, isInitialized: true, isLoading: false });
      }
    } catch (err) {
      localStorage.removeItem('aether_token');
      set({ user: null, token: null, isInitialized: true, isLoading: false });
    }
  },

  sendOtp: async (email, purpose, name) => {
    try {
      set({ isLoading: true, error: null });
      await api.post('/auth/send-otp', { email, purpose, name });
      set({ isLoading: false });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send verification code';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // 1. Sign In Flow: Step 1 initiates 2FA OTP to Gmail
  initiateLogin: async (identifier, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/login-init', { identifier, password });
      const { email } = res.data.data;

      set({
        isOtpStep: true,
        otpPendingEmail: email,
        otpPurpose: 'login',
        isLoading: false,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email/username or password';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // 1. Sign In Flow: Step 2 completes login after OTP
  completeLoginWithOtp: async (email, otp) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/login-otp', { email, otp });
      const { user, token } = res.data.data;

      localStorage.setItem('aether_token', token);
      set({
        user,
        token,
        isOtpStep: false,
        otpPendingEmail: null,
        otpPurpose: null,
        isLoading: false,
      });
      socketService.connect(token);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid verification code';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // 2. Sign Up Flow: Step 1 validates form and sends OTP to Gmail
  initiateRegister: async (data) => {
    try {
      set({ isLoading: true, error: null });
      await api.post('/auth/send-otp', {
        email: data.email,
        purpose: 'register',
        name: data.name,
      });

      set({
        isOtpStep: true,
        otpPendingEmail: data.email,
        otpPurpose: 'register',
        pendingRegisterData: data,
        isLoading: false,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to send OTP code';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // 2. Sign Up Flow: Step 2 submits verified OTP to create user
  completeRegisterWithOtp: async (otp) => {
    const data = get().pendingRegisterData;
    if (!data) throw new Error('Registration session expired');

    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/register', {
        ...data,
        otp,
      });
      const { user, token } = res.data.data;

      localStorage.setItem('aether_token', token);
      set({
        user,
        token,
        isOtpStep: false,
        otpPendingEmail: null,
        otpPurpose: null,
        pendingRegisterData: null,
        isLoading: false,
      });
      socketService.connect(token);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid verification code';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  login: async (identifier, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/login', { identifier, password });
      const { user, token } = res.data.data;

      localStorage.setItem('aether_token', token);
      set({ user, token, isLoading: false });
      socketService.connect(token);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  googleLogin: async (idToken: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.post('/auth/google', { idToken });
      const { user, token } = res.data.data;

      localStorage.setItem('aether_token', token);
      set({ user, token, isLoading: false });
      socketService.connect(token);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Google authentication failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateProfile: async (data: Partial<IUser>) => {
    try {
      const res = await api.patch('/users/me', data);
      if (res.data.success) {
        set({ user: res.data.data });
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update profile');
    }
  },

  updatePrivacy: async (privacy: IPrivacySettings) => {
    try {
      const res = await api.patch('/users/me/privacy', privacy);
      if (res.data.success && get().user) {
        set({
          user: {
            ...get().user!,
            privacySettings: res.data.data,
          },
        });
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update privacy settings');
    }
  },

  blockUser: async (userId: string) => {
    try {
      await api.post(`/users/block/${userId}`);
      if (get().user) {
        const blocked = get().user!.blockedUsers || [];
        set({
          user: {
            ...get().user!,
            blockedUsers: [...blocked, userId],
          },
        });
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to block user');
    }
  },

  unblockUser: async (userId: string) => {
    try {
      await api.post(`/users/unblock/${userId}`);
      if (get().user) {
        const blocked = (get().user!.blockedUsers || []).filter((id) => id !== userId);
        set({
          user: {
            ...get().user!,
            blockedUsers: blocked,
          },
        });
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to unblock user');
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('aether_token');
    socketService.disconnect();
    set({ user: null, token: null });
  },
}));
