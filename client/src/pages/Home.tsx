import { useEffect } from 'react';
import { BiometricAuth } from '@/components/BiometricAuth';
import { QuickCapture } from '@/components/QuickCapture';
import { BucketsScreen } from '@/components/BucketsScreen';
import { BucketView } from '@/components/BucketView';
import { CaptureView } from '@/components/CaptureView';
import { EditCapture } from '@/components/EditCapture';
import { useStore } from '@/store/useStore';
import { indexedDBService } from '@/lib/indexeddb';

export default function Home() {
  const { isAuthenticated, navigation } = useStore();

  useEffect(() => {
    // Initialize IndexedDB on app load
    indexedDBService.init().catch(console.error);
  }, []);

  if (!isAuthenticated) {
    return <BiometricAuth />;
  }

  switch (navigation.currentScreen) {
    case 'quick-capture':
      return <QuickCapture />;
    case 'buckets-screen':
      return <BucketsScreen />;
    case 'bucket-view':
      return <BucketView />;
    case 'capture-view':
      return <CaptureView />;
    case 'edit-capture':
      return <EditCapture />;
    default:
      return <QuickCapture />;
  }
}
