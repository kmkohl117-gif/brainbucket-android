import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { X, CheckSquare, Lightbulb, Bookmark, Star, CheckCircle, Camera, Paperclip, Link as LinkIcon, Trash2 } from 'lucide-react';
import type { Capture, Bucket, Folder, CaptureType } from '@shared/schema';

export function EditCapture() {
  const { navigation, setCurrentScreen } = useStore();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    text: '',
    description: '',
    type: 'task' as CaptureType,
    bucketId: '',
    folderId: '',
    isStarred: false,
    isCompleted: false,
  });

  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [attachments, setAttachments] = useState<Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size?: number;
  }>>([]);

  const { data: capture } = useQuery<Capture>({
    queryKey: ['/api/captures', navigation.selectedCaptureId],
    enabled: !!navigation.selectedCaptureId,
  });

  const { data: buckets = [] } = useQuery<Bucket[]>({
    queryKey: ['/api/buckets'],
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ['/api/folders', 'bucket', formData.bucketId],
    enabled: !!formData.bucketId && formData.bucketId !== 'unsorted',
  });

  const updateCaptureMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Capture> }) => {
      const response = await apiRequest('PATCH', `/api/captures/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket', formData.bucketId] });
      setCurrentScreen('capture-view');
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, bucketId }: { name: string; bucketId: string }) => {
      const response = await apiRequest('POST', '/api/folders', { name, bucketId });
      return response.json();
    },
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders', 'bucket', formData.bucketId] });
      setFormData({ ...formData, folderId: newFolder.id });
      setShowCreateFolderDialog(false);
      setNewFolderName('');
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess: (fileInfo) => {
      setAttachments([...attachments, fileInfo]);
    },
  });

  useEffect(() => {
    if (capture) {
      setFormData({
        text: capture.text,
        description: capture.description || '',
        type: capture.type as CaptureType,
        bucketId: capture.bucketId,
        folderId: capture.folderId || '',
        isStarred: capture.isStarred || false,
        isCompleted: capture.isCompleted || false,
      });
      setAttachments(capture.attachments || []);
    }
  }, [capture]);

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

  const handleSave = async () => {
    if (!formData.text.trim()) return;

    await updateCaptureMutation.mutateAsync({
      id: capture.id,
      updates: {
        text: formData.text,
        description: formData.description || undefined,
        type: formData.type,
        bucketId: formData.bucketId,
        folderId: formData.folderId || undefined,
        isStarred: formData.isStarred,
        isCompleted: formData.isCompleted,
        attachments: attachments,
      }
    });
  };

  const handleFileUpload = (acceptType?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (acceptType) {
      input.accept = acceptType;
    }
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFileMutation.mutate(uploadFormData);
      }
    };
    input.click();
  };

  const handlePhotoUpload = () => {
    handleFileUpload('image/*');
  };

  const handleAddLink = () => {
    if (linkUrl.trim() && linkName.trim()) {
      const linkAttachment = {
        id: Date.now().toString(),
        name: linkName.trim(),
        type: 'link',
        url: linkUrl.trim(),
      };
      setAttachments([...attachments, linkAttachment]);
      setLinkUrl('');
      setLinkName('');
      setShowLinkDialog(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter(att => att.id !== attachmentId));
  };

  const captureTypes = [
    { id: 'task', label: 'Task', icon: CheckSquare, color: 'text-primary' },
    { id: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-accent' },
    { id: 'reference', label: 'Reference', icon: Bookmark, color: 'text-muted-foreground' },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('capture-view')}
            data-testid="button-cancel"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Edit Capture</h1>
          <Button
            onClick={handleSave}
            disabled={!formData.text.trim() || updateCaptureMutation.isPending}
            size="sm"
            data-testid="button-save"
          >
            Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Main Text */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Capture</label>
          <Textarea
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="min-h-[100px] resize-none"
            data-testid="input-capture-text"
          />
        </div>

        {/* Type Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Type</label>
          <div className="grid grid-cols-3 gap-3">
            {captureTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.id;
              
              return (
                <Button
                  key={type.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setFormData({ ...formData, type: type.id as CaptureType })}
                  className="p-3 h-auto flex-col space-y-1"
                  data-testid={`button-type-${type.id}`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : type.color}`} />
                  <span className="text-sm font-medium">{type.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Bucket Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bucket</label>
          <Select
            value={formData.bucketId}
            onValueChange={(bucketId) => setFormData({ ...formData, bucketId, folderId: '' })}
          >
            <SelectTrigger data-testid="select-bucket">
              <SelectValue placeholder="Select bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unsorted">Unsorted</SelectItem>
              {buckets.map((bucket) => (
                <SelectItem key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Folder Picker */}
        {formData.bucketId && formData.bucketId !== 'unsorted' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Folder (optional)</label>
            <Select
              value={formData.folderId || "none"}
              onValueChange={(folderId) => {
                if (folderId === "new") {
                  setShowCreateFolderDialog(true);
                } else {
                  setFormData({ ...formData, folderId: folderId === "none" ? "" : folderId });
                }
              }}
            >
              <SelectTrigger data-testid="select-folder">
                <SelectValue placeholder="None (Inbox)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Inbox)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Create New Folder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Star Toggle */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="w-5 h-5 text-accent mr-3" />
                <span className="font-medium text-foreground">Star this capture</span>
              </div>
              <Switch
                checked={formData.isStarred}
                onCheckedChange={(checked) => setFormData({ ...formData, isStarred: checked })}
                data-testid="switch-starred"
              />
            </div>
          </CardContent>
        </Card>

        {/* Done Toggle (for Tasks) */}
        {formData.type === 'task' && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span className="font-medium text-foreground">Mark as done</span>
                </div>
                <Switch
                  checked={formData.isCompleted}
                  onCheckedChange={(checked) => setFormData({ ...formData, isCompleted: checked })}
                  data-testid="switch-completed"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description (optional)</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add more details..."
            className="min-h-[80px] resize-none"
            data-testid="input-description"
          />
        </div>

        {/* Media Upload */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Attachments</label>
          
          {/* Upload buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={handlePhotoUpload}
              disabled={uploadFileMutation.isPending}
              className="p-3 h-auto flex-col space-y-1"
              data-testid="button-upload-photo"
            >
              <Camera className="w-5 h-5 text-primary" />
              <span className="text-xs">Photo</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleFileUpload()}
              disabled={uploadFileMutation.isPending}
              className="p-3 h-auto flex-col space-y-1"
              data-testid="button-upload-file"
            >
              <Paperclip className="w-5 h-5 text-accent" />
              <span className="text-xs">File</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLinkDialog(true)}
              className="p-3 h-auto flex-col space-y-1"
              data-testid="button-add-link"
            >
              <LinkIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">Link</span>
            </Button>
          </div>

          {/* Current attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <Card key={attachment.id}>
                  <CardContent className="p-3 flex items-center">
                    <LinkIcon className="w-5 h-5 text-primary mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : 'Link'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-remove-${attachment.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

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
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newFolderName.trim()) {
                  createFolderMutation.mutate({
                    name: newFolderName.trim(),
                    bucketId: formData.bucketId
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

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Link Name</label>
              <Input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Enter link name"
                className="mt-1"
                data-testid="input-link-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">URL</label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="mt-1"
                data-testid="input-link-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkUrl('');
                setLinkName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLink}
              disabled={!linkUrl.trim() || !linkName.trim()}
              data-testid="button-add-link-confirm"
            >
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
