import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Star, Edit, Calendar, Share, Copy, Trash2, ExternalLink, FileText, Link as LinkIcon, FolderOpen, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Capture, Bucket, Folder } from '@shared/schema';

export function CaptureView() {
  const { navigation, setCurrentScreen, setSelectedCapture } = useStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Move dialog state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: capture } = useQuery<Capture>({
    queryKey: ['/api/captures', navigation.selectedCaptureId],
    enabled: !!navigation.selectedCaptureId,
  });

  const { data: bucket } = useQuery<Bucket>({
    queryKey: ['/api/buckets', capture?.bucketId],
    enabled: !!capture?.bucketId,
  });

  // Additional queries for move functionality
  const { data: buckets = [] } = useQuery<Bucket[]>({
    queryKey: ['/api/buckets'],
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ['/api/folders', 'bucket', selectedBucketId],
    enabled: !!selectedBucketId && selectedBucketId !== '__unsorted__',
  });

  const { data: currentFolder } = useQuery<Folder>({
    queryKey: ['/api/folders', capture?.folderId],
    enabled: !!capture?.folderId,
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
      // Invalidate specific capture query
      queryClient.invalidateQueries({ queryKey: ['/api/captures', capture?.id] });
    },
  });

  const deleteCaptureMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/captures/${id}`);
    },
    onSuccess: () => {
      // Invalidate all capture-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'folder'] });
      setCurrentScreen('bucket-view');
    },
  });

  const duplicateCaptureMutation = useMutation({
    mutationFn: async (captureData: Partial<Capture>) => {
      const response = await apiRequest('POST', '/api/captures', captureData);
      return response.json();
    },
    onSuccess: (newCapture) => {
      // Invalidate all capture-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'folder'] });
      setSelectedCapture(newCapture.id);
      setCurrentScreen('edit-capture');
    },
  });

  const moveCaptureMutation = useMutation({
    mutationFn: async ({ bucketId, folderId }: { bucketId: string | null; folderId?: string }) => {
      const response = await apiRequest('PATCH', `/api/captures/${capture?.id}`, {
        bucketId,
        folderId: folderId || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all capture-related queries to ensure proper sorting after move
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'folder'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', capture?.id] });
      setShowMoveDialog(false);
      setSelectedBucketId('');
      setSelectedFolderId('');
      toast({
        title: 'Success',
        description: 'Capture moved successfully',
      });
    },
    onError: (error) => {
      console.error('Error moving capture:', error);
      toast({
        title: 'Error',
        description: 'Failed to move capture. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, bucketId }: { name: string; bucketId: string }) => {
      const response = await apiRequest('POST', '/api/folders', { name, bucketId });
      return response.json();
    },
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'bucket', selectedBucketId] });
      setSelectedFolderId(newFolder.id);
      setShowCreateFolderDialog(false);
      setNewFolderName('');
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (!capture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Capture not found</p>
          <Button 
            variant="outline" 
            onClick={() => setCurrentScreen('buckets-screen')}
            className="mt-2"
          >
            Back to Buckets
          </Button>
        </div>
      </div>
    );
  }

  const handleStarToggle = () => {
    updateCaptureMutation.mutate({
      id: capture.id,
      updates: { isStarred: !capture.isStarred }
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this capture?')) {
      deleteCaptureMutation.mutate(capture.id);
    }
  };

  const handleEdit = () => {
    setCurrentScreen('edit-capture');
  };

  const handleDuplicate = () => {
    const duplicateData = {
      text: `${capture.text} (Copy)`,
      description: capture.description,
      type: capture.type,
      bucketId: capture.bucketId,
      folderId: capture.folderId,
      isStarred: false, // Reset starred status for duplicates
      isCompleted: false, // Reset completion status for duplicates
      attachments: capture.attachments || [], // Copy attachments
    };
    
    duplicateCaptureMutation.mutate(duplicateData);
  };

  const handleMoveClick = () => {
    setSelectedBucketId(capture.bucketId || '__unsorted__');
    setSelectedFolderId(capture.folderId || '');
    setShowMoveDialog(true);
  };

  const handleMove = () => {
    if (!selectedBucketId) return;
    
    // Handle 'unsorted' case by setting bucketId to null
    const bucketIdToSend = selectedBucketId === '__unsorted__' ? null : selectedBucketId;
    
    moveCaptureMutation.mutate({
      bucketId: bucketIdToSend,
      folderId: selectedFolderId || undefined,
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !selectedBucketId || selectedBucketId === '__unsorted__') return;
    
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      bucketId: selectedBucketId,
    });
  };

  const handleOpenAttachment = (attachment: any) => {
    try {
      // Check if it's a file upload (starts with /uploads) or external link
      if (attachment.url.startsWith('/uploads/')) {
        // For uploaded files, open in new tab with full URL
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
      } else if (attachment.url.match(/^https?:\/\//)) {
        // For external links, open directly
        window.open(attachment.url, '_blank', 'noopener,noreferrer');
      } else {
        // For relative links, prepend current domain
        const fullUrl = new URL(attachment.url, window.location.origin).toString();
        window.open(fullUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening attachment:', error);
      // Fallback: just open the URL as-is
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    }
  };

  const getCaptureTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-primary/10 text-primary';
      case 'idea': return 'bg-accent/10 text-accent';
      case 'reference': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAttachmentIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-destructive" />;
    if (type.includes('image')) return <FileText className="w-5 h-5 text-primary" />;
    return <LinkIcon className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('bucket-view')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Capture Details</h1>
          <Button
            onClick={handleEdit}
            size="sm"
            data-testid="button-edit"
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        <div className="space-y-4">
          {/* Capture Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-2">{capture.text}</h2>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded ${getCaptureTypeColor(capture.type)}`}>
                  {capture.type}
                </span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  {bucket?.name || 'Unsorted'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Created {formatDistanceToNow(new Date(capture.createdAt || new Date()), { addSuffix: true })}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStarToggle}
              className="ml-4"
              data-testid="button-star"
            >
              <Star className={`w-5 h-5 ${capture.isStarred ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
            </Button>
          </div>

          {/* Description */}
          {capture.description && (
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Description</h3>
              <p className="text-muted-foreground">{capture.description}</p>
            </div>
          )}

          {/* Attachments */}
          {capture.attachments && capture.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Attachments</h3>
              <div className="space-y-2">
                {capture.attachments.map((attachment) => (
                  <Card key={attachment.id}>
                    <CardContent className="p-3 flex items-center">
                      {getAttachmentIcon(attachment.type)}
                      <div className="flex-1 ml-3">
                        <p className="text-sm font-medium text-foreground">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : 'Link'}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleOpenAttachment(attachment)}
                        data-testid={`button-open-${attachment.id}`}
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-add-calendar"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add to Google Calendar
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleMoveClick}
              className="w-full"
              disabled={moveCaptureMutation.isPending}
              data-testid="button-move-folder"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Move to Folder
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                data-testid="button-share"
              >
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline"
                onClick={handleDuplicate}
                disabled={duplicateCaptureMutation.isPending}
                data-testid="button-duplicate"
              >
                <Copy className="w-4 h-4 mr-2" />
                {duplicateCaptureMutation.isPending ? 'Duplicating...' : 'Duplicate'}
              </Button>
            </div>
            
            <Button 
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
              disabled={deleteCaptureMutation.isPending}
              data-testid="button-delete"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Capture
            </Button>
          </div>
        </div>
      </div>

      {/* Move to Folder Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
            <DialogDescription>
              Select the bucket and folder where you want to move this capture.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Location */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Currently in:</label>
              <div className="text-sm font-medium text-foreground">
                {bucket?.name || 'Unsorted'} {currentFolder && `• ${currentFolder.name}`}
              </div>
            </div>

            {/* Bucket Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Move to Bucket</label>
              <Select
                value={selectedBucketId || '__unsorted__'}
                onValueChange={(bucketId) => {
                  setSelectedBucketId(bucketId);
                  setSelectedFolderId('');
                }}
              >
                <SelectTrigger data-testid="select-move-bucket">
                  <SelectValue placeholder="Select bucket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unsorted__">Unsorted</SelectItem>
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.id} value={bucket.id}>
                      {bucket.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Folder Selection */}
            {selectedBucketId && selectedBucketId !== '__unsorted__' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Select Folder</label>
                <Select
                  value={selectedFolderId || "none"}
                  onValueChange={(folderId) => {
                    if (folderId === "new") {
                      setShowCreateFolderDialog(true);
                    } else {
                      setSelectedFolderId(folderId === "none" ? "" : folderId);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-move-folder">
                    <SelectValue placeholder="None (Inbox)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Inbox)</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">
                      <div className="flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Folder
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMoveDialog(false)}
              data-testid="button-cancel-move"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={!selectedBucketId || moveCaptureMutation.isPending}
              data-testid="button-confirm-move"
            >
              {moveCaptureMutation.isPending ? 'Moving...' : 'Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder in the selected bucket.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Folder Name</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
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
              onClick={handleCreateFolder}
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
