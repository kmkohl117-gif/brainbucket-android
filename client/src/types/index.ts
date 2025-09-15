export interface NavigationState {
  currentScreen: 'biometric-auth' | 'quick-capture' | 'buckets-screen' | 'bucket-view' | 'capture-view' | 'edit-capture';
  selectedBucketId?: string;
  selectedCaptureId?: string;
  selectedFolderId?: string;
}

export interface QuickCaptureState {
  text: string;
  type: 'task' | 'idea' | 'reference';
  selectedBucketId: string;
  selectedFolderId?: string;
}

export interface AppState {
  isAuthenticated: boolean;
  navigation: NavigationState;
  quickCapture: QuickCaptureState;
  isOnline: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
}
