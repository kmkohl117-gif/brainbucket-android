import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { QuickCapture } from './components/QuickCapture';
import { BucketsView } from './components/BucketsView';
import { BucketDetail } from './components/BucketDetail';
import { SearchView } from './components/SearchView';
import { CaptureView } from './components/CaptureView';
import { CaptureEdit } from './components/CaptureEdit';
import { FolderDetail } from './components/FolderDetail';

function AppContent() {
  const { state } = useApp();

  const renderContent = () => {
    switch (state.activeView) {
      case 'capture':
        return <QuickCapture />;
      case 'search':
        return <SearchView />;
      case 'buckets':
        return <BucketsView />;
      case 'bucket-detail':
        return <BucketDetail />;
      case 'folder-detail':
        return <FolderDetail />;
      case 'capture-view':
        return <CaptureView />;
      case 'capture-edit':
        return <CaptureEdit />;
      default:
        return <QuickCapture />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderContent()}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;