import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { BottomNavigation } from './BottomNavigation';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Plus, Star, GripVertical, Folder as FolderIcon, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Bucket, Capture, Folder } from '@shared/schema';

export function BucketView() {
  const { navigation, setCurrentScreen, setSelectedCapture, updateQuickCapture } = useStore();
  const queryClient = useQueryClient();

  const { data: bucket } = useQuery<Bucket>({
    queryKey: ['/api/buckets', navigation.selectedBucketId],
    enabled: !!navigation.selectedBucketId && navigation.selectedBucketId !== 'unsorted',
  });

  const { data: captures = [] } = useQuery<Capture[]>({
    queryKey: ['/api/captures', 'bucket', navigation.selectedBucketId],
    enabled: !!navigation.selectedBucketId,
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ['/api/folders', 'bucket', navigation.selectedBucketId],
    enabled: !!navigation.selectedBucketId && navigation.selectedBucketId !== 'unsorted',
  });

  const updateCaptureMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Capture> }) => {
      const response = await apiRequest('PATCH', `/api/captures/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket', navigation.selectedBucketId] });
    },
  });

  const inboxCaptures = captures.filter(capture => !capture.folderId && !capture.isCompleted);
  const completedCount = captures.filter(capture => capture.isCompleted).length;

  const handleCaptureClick = (captureId: string) => {
    setSelectedCapture(captureId);
    setCurrentScreen('capture-view');
  };

  const handleStarToggle = (capture: Capture) => {
    updateCaptureMutation.mutate({
      id: capture.id,
      updates: { isStarred: !capture.isStarred }
    });
  };

  const handleCompleteToggle = (capture: Capture) => {
    updateCaptureMutation.mutate({
      id: capture.id,
      updates: { isCompleted: !capture.isCompleted }
    });
  };

  const handleQuickCapture = () => {
    updateQuickCapture({ 
      selectedBucketId: navigation.selectedBucketId || 'unsorted',
      text: '' 
    });
    setCurrentScreen('quick-capture');
  };

  const getCaptureTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-primary/10 text-primary';
      case 'idea': return 'bg-accent/10 text-accent';
      case 'reference': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const bucketName = bucket?.name || (navigation.selectedBucketId === 'unsorted' ? 'Unsorted' : 'Unknown');
  const totalItems = captures.length;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('buckets-screen')}
              className="mr-3"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{bucketName}</h1>
              <p className="text-sm text-muted-foreground">{totalItems} items total</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQuickCapture}
            data-testid="button-add-capture"
          >
            <Plus className="w-5 h-5 text-primary" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Inbox Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
            <span className="text-sm text-muted-foreground">{inboxCaptures.length} items</span>
          </div>
          
          {/* Inbox Items */}
          <div className="space-y-2">
            {inboxCaptures.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  No items in inbox
                </CardContent>
              </Card>
            ) : (
              inboxCaptures.map((capture) => (
                <Card
                  key={capture.id}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleCaptureClick(capture.id)}
                  data-testid={`card-capture-${capture.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start">
                      <Checkbox
                        checked={capture.isCompleted || false}
                        onCheckedChange={() => handleCompleteToggle(capture)}
                        className="mt-1 mr-3"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`checkbox-complete-${capture.id}`}
                      />
                      <div className="flex-1">
                        <p className="text-foreground">{capture.text}</p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${getCaptureTypeColor(capture.type)}`}>
                            {capture.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(capture.createdAt || new Date()), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStarToggle(capture);
                        }}
                        className="ml-2 p-1"
                        data-testid={`button-star-${capture.id}`}
                      >
                        <Star className={`w-4 h-4 ${capture.isStarred ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button variant="ghost" size="sm" className="ml-2 p-1">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Folders Section */}
        {navigation.selectedBucketId !== 'unsorted' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Folders</h2>
              <Button variant="ghost" size="sm" className="text-sm text-primary" data-testid="button-new-folder">
                <Plus className="w-4 h-4 mr-1" />
                New Folder
              </Button>
            </div>

            {/* Folder Cards */}
            <div className="space-y-3">
              {folders.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-muted-foreground">
                    No folders yet
                  </CardContent>
                </Card>
              ) : (
                folders.map((folder) => {
                  const folderCaptures = captures.filter(c => c.folderId === folder.id);
                  const hasItems = folderCaptures.length > 0;
                  
                  return (
                    <Card
                      key={folder.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`card-folder-${folder.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FolderIcon className="text-accent text-xl mr-3" />
                            <div>
                              <h3 className="font-medium text-foreground">{folder.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {folderCaptures.length} items
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {hasItems && (
                              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                            )}
                            <Button variant="ghost" size="sm" className="p-1">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Done Folder */}
        <Card className="bg-muted/50 border-dashed border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="text-accent text-xl mr-3" />
                <div>
                  <h3 className="font-medium text-foreground">Done</h3>
                  <p className="text-sm text-muted-foreground">Completed tasks auto-collect here</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{completedCount} items</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
