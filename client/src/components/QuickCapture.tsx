import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { BottomNavigation } from './BottomNavigation';
import { TaskTemplates } from './TaskTemplates';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { CheckSquare, Lightbulb, Bookmark, Plus, Grid3X3, Check } from 'lucide-react';
import type { Bucket, InsertCapture } from '@shared/schema';

export function QuickCapture() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { quickCapture, updateQuickCapture, setCurrentScreen } = useStore();
  const queryClient = useQueryClient();

  const { data: buckets = [] } = useQuery<Bucket[]>({
    queryKey: ['/api/buckets'],
  });

  const createCaptureMutation = useMutation({
    mutationFn: async (captureData: InsertCapture) => {
      const response = await apiRequest('POST', '/api/captures', captureData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/captures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/captures', 'bucket'] });
    },
  });

  const captureTypes = [
    { id: 'task', label: 'Task', icon: CheckSquare, color: 'text-primary' },
    { id: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-accent' },
    { id: 'reference', label: 'Reference', icon: Bookmark, color: 'text-muted-foreground' },
  ] as const;

  const handleAddCapture = async () => {
    if (!quickCapture.text.trim()) return;

    setIsSubmitting(true);
    
    try {
      await createCaptureMutation.mutateAsync({
        text: quickCapture.text,
        type: quickCapture.type,
        bucketId: quickCapture.selectedBucketId,
        folderId: quickCapture.selectedFolderId,
        userId: 'user-123', // Mock user ID
      });

      // Reset form
      updateQuickCapture({ text: '', selectedFolderId: undefined });
      
      // Show success state briefly
      setTimeout(() => setIsSubmitting(false), 1000);
    } catch (error) {
      console.error('Failed to create capture:', error);
      setIsSubmitting(false);
    }
  };

  const handleTypeSelect = (type: 'task' | 'idea' | 'reference') => {
    updateQuickCapture({ type });
  };

  const handleTemplateSelect = (templateText: string) => {
    updateQuickCapture({ text: templateText });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Quick Capture</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('buckets-screen')}
            data-testid="button-buckets"
          >
            <Grid3X3 className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Quick Capture Input */}
        <div className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder="What's on your mind?"
              value={quickCapture.text}
              onChange={(e) => updateQuickCapture({ text: e.target.value })}
              className="min-h-[120px] text-lg resize-none"
              data-testid="input-capture-text"
            />
          </div>

          {/* Capture Type Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {captureTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = quickCapture.type === type.id;
              
              return (
                <Button
                  key={type.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleTypeSelect(type.id)}
                  className="p-3 h-auto flex-col space-y-1"
                  data-testid={`button-type-${type.id}`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : type.color}`} />
                  <span className="text-sm font-medium">{type.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Bucket Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Add to bucket:</label>
            <Select
              value={quickCapture.selectedBucketId}
              onValueChange={(bucketId) => updateQuickCapture({ selectedBucketId: bucketId })}
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

          {/* Task Templates */}
          {quickCapture.type === 'task' && (
            <TaskTemplates onTemplateSelect={handleTemplateSelect} />
          )}

          {/* Add Button */}
          <Button
            onClick={handleAddCapture}
            disabled={!quickCapture.text.trim() || isSubmitting}
            className="w-full py-4 text-lg font-medium"
            data-testid="button-add-capture"
          >
            {isSubmitting ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Added!
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Add Capture
              </>
            )}
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
