import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Star, Edit, Calendar, Share, Copy, Trash2, ExternalLink, FileText, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Capture, Bucket } from '@shared/schema';

export function CaptureView() {
  const { navigation, setCurrentScreen, setSelectedCapture } = useStore();
  const queryClient = useQueryClient();

  const { data: capture } = useQuery<Capture>({
    queryKey: ['/api/captures', navigation.selectedCaptureId],
    enabled: !!navigation.selectedCaptureId,
  });

  const { data: bucket } = useQuery<Bucket>({
    queryKey: ['/api/buckets', capture?.bucketId],
    enabled: !!capture?.bucketId,
  });

  const updateCaptureMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Capture> }) => {
      const response = await apiRequest('PATCH', `/api/captures/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
    },
  });

  const deleteCaptureMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/captures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      setCurrentScreen('bucket-view');
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
                  Created {formatDistanceToNow(new Date(capture.createdAt), { addSuffix: true })}
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
                      <Button variant="ghost" size="sm" data-testid={`button-open-${attachment.id}`}>
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
                data-testid="button-duplicate"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
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
    </div>
  );
}
