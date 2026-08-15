import { create } from 'zustand';
import { api } from '../services/api';
import { IStatus, IStatusUserGroup } from '../types';

interface StatusState {
  statusGroups: IStatusUserGroup[];
  activeStatusGroup: IStatusUserGroup | null;
  activeStatusIndex: number;
  isLoading: boolean;
  isViewerOpen: boolean;
  isCreateOpen: boolean;

  // Actions
  fetchStatuses: () => Promise<void>;
  createStatus: (data: {
    type: 'text' | 'image' | 'video';
    content?: string;
    mediaUrl?: string;
    caption?: string;
    backgroundColor?: string;
    privacy?: 'everyone' | 'contacts' | 'selected';
    allowedUsers?: string[];
  }) => Promise<void>;
  viewStatus: (statusId: string) => Promise<void>;
  deleteStatus: (statusId: string) => Promise<void>;

  openViewer: (group: IStatusUserGroup, index?: number) => void;
  closeViewer: () => void;
  nextStatus: () => void;
  prevStatus: () => void;
  openCreate: () => void;
  closeCreate: () => void;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  statusGroups: [],
  activeStatusGroup: null,
  activeStatusIndex: 0,
  isLoading: false,
  isViewerOpen: false,
  isCreateOpen: false,

  fetchStatuses: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/statuses/feed');
      if (res.data.success) {
        set({ statusGroups: res.data.data, isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createStatus: async (data) => {
    try {
      const res = await api.post('/statuses', data);
      if (res.data.success) {
        await get().fetchStatuses();
        set({ isCreateOpen: false });
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create status');
    }
  },

  viewStatus: async (statusId: string) => {
    try {
      await api.post(`/statuses/${statusId}/view`);
    } catch (e) {}
  },

  deleteStatus: async (statusId: string) => {
    try {
      await api.delete(`/statuses/${statusId}`);
      await get().fetchStatuses();
      get().closeViewer();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete status');
    }
  },

  openViewer: (group, index = 0) => {
    set({
      activeStatusGroup: group,
      activeStatusIndex: index,
      isViewerOpen: true,
    });
    if (group.statuses[index]) {
      get().viewStatus(group.statuses[index]._id);
    }
  },

  closeViewer: () => {
    set({
      activeStatusGroup: null,
      activeStatusIndex: 0,
      isViewerOpen: false,
    });
  },

  nextStatus: () => {
    const { activeStatusGroup, activeStatusIndex, statusGroups } = get();
    if (!activeStatusGroup) return;

    if (activeStatusIndex < activeStatusGroup.statuses.length - 1) {
      const nextIdx = activeStatusIndex + 1;
      set({ activeStatusIndex: nextIdx });
      get().viewStatus(activeStatusGroup.statuses[nextIdx]._id);
    } else {
      // Move to next user's story
      const currentGroupIdx = statusGroups.findIndex((g) => g.user._id === activeStatusGroup.user._id);
      if (currentGroupIdx > -1 && currentGroupIdx < statusGroups.length - 1) {
        const nextGroup = statusGroups[currentGroupIdx + 1];
        set({ activeStatusGroup: nextGroup, activeStatusIndex: 0 });
        get().viewStatus(nextGroup.statuses[0]._id);
      } else {
        get().closeViewer();
      }
    }
  },

  prevStatus: () => {
    const { activeStatusGroup, activeStatusIndex } = get();
    if (!activeStatusGroup) return;

    if (activeStatusIndex > 0) {
      set({ activeStatusIndex: activeStatusIndex - 1 });
    }
  },

  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
}));
