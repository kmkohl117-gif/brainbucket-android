import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { BottomNavigation } from './BottomNavigation';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Search, Plus, Palette, CheckSquare, ShoppingCart, Lightbulb, Lock, Heart, Home, Briefcase, Camera, MapPin, GripVertical } from 'lucide-react';
import type { Bucket, Capture, InsertBucket } from '@shared/schema';
import { SortableList, SortableItem } from '@/components/dnd';
import { useToast } from '@/hooks/use-toast';

export function BucketsScreen() {
  const { setCurrentScreen, setSelectedBucket } = useStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddBucketDialog, setShowAddBucketDialog] = useState(false);
  const [newBucketData, setNewBucketData] = useState({
    name: '',
    color: '#3B82F6',
    icon: 'fas fa-folder'
  });

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

  const createBucketMutation = useMutation({
    mutationFn: async (bucketData: Omit<InsertBucket, 'userId'>) => {
      const response = await apiRequest('POST', '/api/buckets', bucketData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buckets'] });
      setShowAddBucketDialog(false);
      setNewBucketData({ name: '', color: '#3B82F6', icon: 'fas fa-folder' });
    },
  });

  const reorderBucketsMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const response = await apiRequest('POST', '/api/buckets/reorder', { orderedIds });
      return response.json();
    },
    onMutate: async (orderedIds: string[]) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/buckets'] });

      // Snapshot the previous value
      const previousBuckets = queryClient.getQueryData<Bucket[]>(['/api/buckets']);

      // Optimistically update bucket order
      if (previousBuckets) {
        const reorderedBuckets = orderedIds
          .map(id => previousBuckets.find(bucket => bucket.id === id))
          .filter(Boolean) as Bucket[];
        
        queryClient.setQueryData(['/api/buckets'], reorderedBuckets);
      }

      // Return a context object with the snapshotted value
      return { previousBuckets };
    },
    onError: (error, orderedIds, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBuckets) {
        queryClient.setQueryData(['/api/buckets'], context.previousBuckets);
      }
      toast({
        title: "Error",
        description: "Failed to reorder buckets. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate and refetch bucket data after successful reorder
      queryClient.invalidateQueries({ queryKey: ['/api/buckets'] });
    },
  });

  const handleAddBucketClick = () => {
    setShowAddBucketDialog(true);
  };

  const handleCreateBucket = () => {
    if (!newBucketData.name.trim()) return;

    createBucketMutation.mutate({
      name: newBucketData.name.trim(),
      color: newBucketData.color,
      icon: newBucketData.icon,
    });
  };

  const resetForm = () => {
    setNewBucketData({ name: '', color: '#3B82F6', icon: 'fas fa-folder' });
    setShowAddBucketDialog(false);
  };

  const handleReorderBuckets = useCallback((reorderedBuckets: Bucket[]) => {
    const orderedIds = reorderedBuckets.map(bucket => bucket.id);
    reorderBucketsMutation.mutate(orderedIds);
  }, [reorderBucketsMutation]);

  const bucketIcons = {
    'To-Dos': 'fas fa-check-square',
    'Creatives': 'fas fa-palette',
    'Shopping Lists': 'fas fa-shopping-cart',
    'Ideas & Dreams': 'fas fa-lightbulb',
    'Vault': 'fas fa-lock',
    'Health': 'fas fa-heart',
  };

  const predefinedColors = [
    '#3B82F6', // Blue
    '#10B981', // Green  
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6B7280'  // Gray
  ];

  const predefinedIcons = [
    { name: 'Folder', icon: 'fas fa-folder' },
    { name: 'Tasks', icon: 'fas fa-check-square' },
    { name: 'Creative', icon: 'fas fa-palette' },
    { name: 'Shopping', icon: 'fas fa-shopping-cart' },
    { name: 'Ideas', icon: 'fas fa-lightbulb' },
    { name: 'Security', icon: 'fas fa-lock' },
    { name: 'Health', icon: 'fas fa-heart' },
    { name: 'Work', icon: 'fas fa-briefcase' },
    { name: 'Home', icon: 'fas fa-home' },
    { name: 'Travel', icon: 'fas fa-map-marker-alt' },
    { name: 'Photos', icon: 'fas fa-camera' },
    { name: 'Music', icon: 'fas fa-music' }
  ];

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

        {/* Sortable Bucket Cards */}
        <SortableList
          items={buckets}
          onReorder={handleReorderBuckets}
          getId={(bucket) => bucket.id}
          strategy="vertical"
          disabled={reorderBucketsMutation.isPending}
          className="space-y-4"
        >
          {(bucket, index, isDragging) => {
            const itemCount = getItemCount(bucket.id);
            const hasIndicator = hasUnorganizedItems(bucket.id);
            
            return (
              <SortableItem 
                key={bucket.id} 
                id={bucket.id}
                className={isDragging ? "opacity-50" : ""}
              >
                <Card
                  className="cursor-pointer hover:scale-[1.02] transition-transform relative"
                  style={{
                    background: `linear-gradient(135deg, ${bucket.color}, color-mix(in srgb, ${bucket.color} 90%, white))`,
                    border: `1px solid color-mix(in srgb, ${bucket.color} 80%, transparent)`
                  }}
                  onClick={(e) => {
                    // Prevent click when dragging
                    if (isDragging) return;
                    handleBucketClick(bucket.id);
                  }}
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
                      <div className="flex items-center space-x-2">
                        {hasIndicator && (
                          <div className="w-3 h-3 bg-white rounded-full" data-testid={`indicator-${bucket.id}`}></div>
                        )}
                        <div className="text-white/60 hover:text-white cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SortableItem>
            );
          }}
        </SortableList>

        {/* Add New Bucket */}
        <Card 
          className="border-2 border-dashed border-border hover:bg-muted transition-colors cursor-pointer"
          onClick={handleAddBucketClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-center" data-testid="button-add-bucket">
              <Plus className="w-5 h-5 text-muted-foreground mr-2" />
              <span className="text-muted-foreground font-medium">Add New Bucket</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
      
      {/* Add Bucket Dialog */}
      <Dialog open={showAddBucketDialog} onOpenChange={setShowAddBucketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Bucket</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Bucket Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Bucket Name</label>
              <Input
                value={newBucketData.name}
                onChange={(e) => setNewBucketData({ ...newBucketData, name: e.target.value })}
                placeholder="Enter bucket name"
                className="w-full"
                data-testid="input-bucket-name"
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Bucket Color</label>
              <div className="grid grid-cols-5 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      newBucketData.color === color
                        ? 'border-foreground scale-110'
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewBucketData({ ...newBucketData, color })}
                    data-testid={`color-option-${color.replace('#', '')}`}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Bucket Icon</label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {predefinedIcons.map((iconOption) => (
                  <button
                    key={iconOption.icon}
                    className={`p-3 border rounded-lg flex flex-col items-center space-y-1 transition-all ${
                      newBucketData.icon === iconOption.icon
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => setNewBucketData({ ...newBucketData, icon: iconOption.icon })}
                    data-testid={`icon-option-${iconOption.name.toLowerCase()}`}
                  >
                    <i className={`${iconOption.icon} text-lg`} style={{ color: newBucketData.icon === iconOption.icon ? newBucketData.color : undefined }} />
                    <span className="text-xs text-center">{iconOption.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <Card
                className="p-4"
                style={{
                  background: `linear-gradient(135deg, ${newBucketData.color}, color-mix(in srgb, ${newBucketData.color} 90%, white))`,
                  border: `1px solid color-mix(in srgb, ${newBucketData.color} 80%, transparent)`
                }}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <i className={`${newBucketData.icon} text-xl text-white`}></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{newBucketData.name || 'Bucket Name'}</h3>
                    <p className="text-sm text-white/80">0 items</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={createBucketMutation.isPending}
              data-testid="button-cancel-bucket"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBucket}
              disabled={!newBucketData.name.trim() || createBucketMutation.isPending}
              data-testid="button-create-bucket"
            >
              {createBucketMutation.isPending ? 'Creating...' : 'Create Bucket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
