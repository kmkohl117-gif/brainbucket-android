import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Plus, Grid3X3, Search } from 'lucide-react';

export function BottomNavigation() {
  const { navigation, setCurrentScreen, updateQuickCapture } = useStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-around">
        <Button
          variant="ghost"
          onClick={() => {
            // Pre-fill folder and bucket info when navigating from folder view
            if (navigation.selectedFolderId) {
              updateQuickCapture({ 
                selectedFolderId: navigation.selectedFolderId,
                selectedBucketId: navigation.selectedBucketId || 'unsorted'
              });
            }
            setCurrentScreen('quick-capture');
          }}
          className={`flex flex-col items-center p-2 space-y-1 ${
            navigation.currentScreen === 'quick-capture' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="nav-capture"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs">Capture</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => (window as any).openGlobalSearch?.()}
          className="flex flex-col items-center p-2 space-y-1 text-muted-foreground hover:text-foreground"
          data-testid="nav-search"
        >
          <Search className="w-6 h-6" />
          <span className="text-xs">Search</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setCurrentScreen('buckets-screen')}
          className={`flex flex-col items-center p-2 space-y-1 ${
            navigation.currentScreen === 'buckets-screen' || navigation.currentScreen === 'bucket-view' 
              ? 'text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="nav-buckets"
        >
          <Grid3X3 className="w-6 h-6" />
          <span className="text-xs">Buckets</span>
        </Button>
      </div>
    </div>
  );
}
