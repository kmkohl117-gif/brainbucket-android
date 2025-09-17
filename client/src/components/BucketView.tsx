import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Plus, Star, GripVertical, Folder as FolderIcon, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Bucket, Capture, Folder } from '@shared/schema';

export function BucketView() {
  const { navigation, setCurrentScreen, setSelectedCapture, setSelectedFolder, updateQuickCapture } = useStore();
  const queryClient = useQueryClient();
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

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

  const { data: folderCaptures = [] } = useQuery<Capture[]>({
    queryKey: ['/api/captures', 'folder', navigation.selectedFolderId],
    enabled: !!navigation.selectedFolderId,
  });

  const { data: selectedFolder } = useQuery<Folder>({
    queryKey: ['/api/folders', navigation.selectedFolderId],
    enabled: !!navigation.selectedFolderId,
  });

  const updateCaptureMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Capture> }) => {
      const response = await apiRequest('PATCH', `/api/captures/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all capture-related queries to ensure proper sorting
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'folder'] });
      // Invalidate specific queries for current context
      if (navigation.selectedBucketId) {
        queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket', navigation.selectedBucketId] });
      }
      if (navigation.selectedFolderId) {
        queryClient.invalidateQueries({ queryKey: ['/api/captures', 'folder', navigation.selectedFolderId] });
      }
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, bucketId }: { name: string; bucketId: string }) => {
      const response = await apiRequest('POST', '/api/folders', { name, bucketId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'bucket', navigation.selectedBucketId] });
      setShowCreateFolderDialog(false);
      setNewFolderName('');
    },
  });

  // Apply client-side sorting to ensure starred items always appear first
  const sortCapturesByStarred = (captures: Capture[]) => {
    return [...captures].sort((a, b) => {
      // Starred items first
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      // Then by creation date (newest first) or order
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return (a.order || 0) - (b.order || 0);
    });
  };

  const sortedCaptures = sortCapturesByStarred(captures);
  const sortedFolderCaptures = sortCapturesByStarred(folderCaptures);
  
  const inboxCaptures = sortedCaptures.filter(capture => !capture.folderId && !capture.isCompleted);
  const completedCount = sortedCaptures.filter(capture => capture.isCompleted).length;
  
  // Determine which view we're showing
  const isViewingFolder = !!navigation.selectedFolderId;
  const currentCaptures = isViewingFolder ? sortedFolderCaptures : inboxCaptures;
  const currentTitle = isViewingFolder ? selectedFolder?.name || 'Folder' : 'Inbox';
  const currentItemCount = isViewingFolder ? folderCaptures.length : inboxCaptures.length;

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
      selectedFolderId: isViewingFolder ? navigation.selectedFolderId : undefined,
      text: '' 
    });
    setCurrentScreen('quick-capture');
  };

  const handleFolderClick = (folderId: string) => {
    setSelectedFolder(folderId);
  };

  const handleBackToFolder = () => {
    setSelectedFolder(undefined);
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
  
  // Header navigation logic
  const headerTitle = isViewingFolder ? selectedFolder?.name || 'Folder' : bucketName;
  const showBackButton = isViewingFolder;
  const onBackClick = showBackButton ? handleBackToFolder : () => setCurrentScreen('buckets-screen');

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 safe-area-pt">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackClick}
              className="mr-3"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{headerTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {isViewingFolder ? `${currentItemCount} items in folder` : `${totalItems} items total`}
              </p>
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
        {/* Current View Section (Inbox or Folder Contents) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{currentTitle}</h2>
            <span className="text-sm text-muted-foreground">{currentItemCount} items</span>
          </div>
          
          {/* Current View Items */}
          <div className="space-y-2">
            {currentCaptures.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  {isViewingFolder ? 'No items in this folder' : 'No items in inbox'}
                </CardContent>
              </Card>
            ) : (
              currentCaptures.map((capture) => (
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

        {/* Folders Section - Only show when not viewing a folder */}
        {!isViewingFolder && navigation.selectedBucketId !== 'unsorted' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Folders</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-sm text-primary" 
                onClick={() => setShowCreateFolderDialog(true)}
                data-testid="button-new-folder"
              >
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
                      onClick={() => handleFolderClick(folder.id)}
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
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-1"
                              onClick={(e) => e.stopPropagation()}
                            >
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

        {/* Done Folder - Only show when not viewing a folder */}
        {!isViewingFolder && (
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
        )}
      </div>

      <BottomNavigation />

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Folder Name</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="mt-1"
                data-testid="input-folder-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFolderDialog(false);
                setNewFolderName('');
              }}
              data-testid="button-cancel-folder"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newFolderName.trim() && navigation.selectedBucketId) {
                  createFolderMutation.mutate({
                    name: newFolderName.trim(),
                    bucketId: navigation.selectedBucketId
                  });
                }
              }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              data-testid="button-create-folder"
            >
              {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
