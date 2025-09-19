import { useEffect, useState } from 'react';
import { BiometricAuth } from '@/components/BiometricAuth';
import { QuickCapture } from '@/components/QuickCapture';
import { BucketsScreen } from '@/components/BucketsScreen';
import { BucketView } from '@/components/BucketView';
import { CaptureView } from '@/components/CaptureView';
import { EditCapture } from '@/components/EditCapture';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useStore } from '@/store/useStore';
import { indexedDBService } from '@/lib/indexeddb';
import { shouldUseLocalStorage } from '@/lib/storage-adapter';

export default function Home() {
  const { isAuthenticated, navigation } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    // Initialize IndexedDB only when using local storage mode
    if (shouldUseLocalStorage()) {
      indexedDBService.init().catch(console.error);
    }
    
    // Load dev utilities only in development mode
    if (import.meta.env.DEV) {
      import('@/lib/dev-utils').catch(console.error);
    }
  }, []);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Don't trigger if user is typing in an input field
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true' ||
          activeElement.getAttribute('role') === 'textbox'
        );

        if (!isInputFocused) {
          e.preventDefault();
          setSearchOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Make search open function available globally
  useEffect(() => {
    // Attach openGlobalSearch to window for external triggers
    (window as any).openGlobalSearch = () => setSearchOpen(true);
    
    return () => {
      delete (window as any).openGlobalSearch;
    };
  }, []);

  if (!isAuthenticated) {
    return <BiometricAuth />;
  }

  const renderCurrentScreen = () => {
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
  };

  return (
    <>
      {renderCurrentScreen()}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
