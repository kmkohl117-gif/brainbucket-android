import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BottomNavigation } from './BottomNavigation';
import { useStore } from '@/store/useStore';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus } from 'lucide-react';
import type { Bucket, Capture } from '@shared/schema';

export function BucketsScreen() {
  const { setCurrentScreen, setSelectedBucket } = useStore();

  const { data: buckets = [] } = useQuery<Bucket[]>({
    queryKey: ['/api/buckets'],
  });

  const { data: captures = [] } = useQuery<Capture[]>({
    queryKey: ['/api/captures'],
  });

  // Count captures per bucket
  const getItemCount = (bucketId: string) => {
    return captures.filter(capture => capture.bucketId === bucketId).length;
  };

  const getUnsortedCount = () => {
    return captures.filter(capture => capture.bucketId === 'unsorted' || !buckets.find(b => b.id === capture.bucketId)).length;
  };

  const hasUnorganizedItems = (bucketId: string) => {
    return captures.some(capture => 
      capture.bucketId === bucketId && !capture.folderId && !capture.isCompleted
    );
  };

  const handleBucketClick = (bucketId: string) => {
    setSelectedBucket(bucketId);
    setCurrentScreen('bucket-view');
  };

  const bucketIcons = {
    'To-Dos': 'fas fa-check-square',
    'Creatives': 'fas fa-palette',
    'Shopping Lists': 'fas fa-shopping-cart',
    'Ideas & Dreams': 'fas fa-lightbulb',
    'Vault': 'fas fa-lock',
    'Health': 'fas fa-heart',
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Buckets</h1>
          <Button variant="ghost" size="sm" data-testid="button-search">
            <Search className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Buckets Grid */}
      <div className="p-4 space-y-4">
        {/* Unsorted Bucket */}
        <Card 
          className="cursor-pointer hover:scale-[1.02] transition-transform bg-muted"
          onClick={() => handleBucketClick('unsorted')}
          data-testid="card-bucket-unsorted"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-inbox text-xl text-muted-foreground"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Unsorted</h3>
                  <p className="text-sm text-muted-foreground">{getUnsortedCount()} items</p>
                </div>
              </div>
              {getUnsortedCount() > 0 && (
                <div className="w-3 h-3 bg-primary rounded-full" data-testid="indicator-unsorted"></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bucket Cards */}
        {buckets.map((bucket) => {
          const itemCount = getItemCount(bucket.id);
          const hasIndicator = hasUnorganizedItems(bucket.id);
          
          return (
            <Card
              key={bucket.id}
              className="cursor-pointer hover:scale-[1.02] transition-transform"
              style={{
                background: `linear-gradient(135deg, ${bucket.color}, color-mix(in srgb, ${bucket.color} 90%, white))`,
                border: `1px solid color-mix(in srgb, ${bucket.color} 80%, transparent)`
              }}
              onClick={() => handleBucketClick(bucket.id)}
              data-testid={`card-bucket-${bucket.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                      <i className={`${bucketIcons[bucket.name as keyof typeof bucketIcons] || bucket.icon} text-xl text-white`}></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{bucket.name}</h3>
                      <p className="text-sm text-white/80">{itemCount} items</p>
                    </div>
                  </div>
                  {hasIndicator && (
                    <div className="w-3 h-3 bg-white rounded-full" data-testid={`indicator-${bucket.id}`}></div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add New Bucket */}
        <Card className="border-2 border-dashed border-border hover:bg-muted transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-center" data-testid="button-add-bucket">
              <Plus className="w-5 h-5 text-muted-foreground mr-2" />
              <span className="text-muted-foreground font-medium">Add New Bucket</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
