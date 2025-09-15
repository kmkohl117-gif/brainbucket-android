import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, NavigationState, QuickCaptureState } from '../types';

interface StoreState extends AppState {
  // Actions
  setAuthenticated: (isAuthenticated: boolean) => void;
  setCurrentScreen: (screen: NavigationState['currentScreen']) => void;
  setSelectedBucket: (bucketId?: string) => void;
  setSelectedCapture: (captureId?: string) => void;
  setSelectedFolder: (folderId?: string) => void;
  updateQuickCapture: (updates: Partial<QuickCaptureState>) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  reset: () => void;
}

const initialState: AppState = {
  isAuthenticated: false,
  navigation: {
    currentScreen: 'biometric-auth',
  },
  quickCapture: {
    text: '',
    type: 'task',
    selectedBucketId: 'unsorted',
  },
  isOnline: navigator.onLine,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuthenticated: (isAuthenticated) => 
        set({ isAuthenticated }),

      setCurrentScreen: (currentScreen) => 
        set((state) => ({
          navigation: { ...state.navigation, currentScreen }
        })),

      setSelectedBucket: (selectedBucketId) =>
        set((state) => ({
          navigation: { ...state.navigation, selectedBucketId }
        })),

      setSelectedCapture: (selectedCaptureId) =>
        set((state) => ({
          navigation: { ...state.navigation, selectedCaptureId }
        })),

      setSelectedFolder: (selectedFolderId) =>
        set((state) => ({
          navigation: { ...state.navigation, selectedFolderId }
        })),

      updateQuickCapture: (updates) =>
        set((state) => ({
          quickCapture: { ...state.quickCapture, ...updates }
        })),

      setOnlineStatus: (isOnline) =>
        set({ isOnline }),

      reset: () => set(initialState),
    }),
    {
      name: 'brain-bucket-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        navigation: state.navigation,
        quickCapture: state.quickCapture,
      }),
    }
  )
);

// Listen to online/offline events
window.addEventListener('online', () => useStore.getState().setOnlineStatus(true));
window.addEventListener('offline', () => useStore.getState().setOnlineStatus(false));
