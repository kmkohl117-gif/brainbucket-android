import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plus, ChevronDown, Fan } from 'lucide-react';
import type { TaskTemplate } from '@shared/schema';

interface TaskTemplatesProps {
  onTemplateSelect: (templateText: string) => void;
}

export function TaskTemplates({ onTemplateSelect }: TaskTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState('');
  const [showNewTemplateInput, setShowNewTemplateInput] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery<TaskTemplate[]>({
    queryKey: ['/api/task-templates'],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: { name: string; category: string }) => {
      const response = await apiRequest('POST', '/api/task-templates', templateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/task-templates'] });
      setNewTemplate('');
      setShowNewTemplateInput(false);
    },
  });

  const cleaningTemplates = templates.filter(t => t.category === 'cleaning');
  const customTemplates = templates.filter(t => t.category !== 'cleaning');

  const handleAddNewTemplate = async () => {
    if (!newTemplate.trim()) return;

    await createTemplateMutation.mutateAsync({
      name: newTemplate,
      category: 'custom',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Quick Task Templates:</label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNewTemplateInput(true)}
          className="text-sm text-primary"
          data-testid="button-new-template"
        >
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {showNewTemplateInput && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder="Enter template name"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              data-testid="input-new-template"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddNewTemplate}
                disabled={!newTemplate.trim() || createTemplateMutation.isPending}
                data-testid="button-save-template"
              >
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewTemplateInput(false);
                  setNewTemplate('');
                }}
                data-testid="button-cancel-template"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {/* Cleaning Templates */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full p-3 justify-start hover:bg-muted"
                data-testid="button-cleaning-templates"
              >
                <Fan className="w-4 h-4 mr-2 text-accent" />
                Cleaning Tasks
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  {cleaningTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onTemplateSelect(template.name)}
                      className="justify-start text-sm h-8"
                      data-testid={`button-template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Custom Templates */}
        {customTemplates.length > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-foreground mb-2">Custom Templates</h4>
                <div className="grid grid-cols-2 gap-2">
                  {customTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onTemplateSelect(template.name)}
                      className="justify-start text-sm h-8"
                      data-testid={`button-custom-template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
