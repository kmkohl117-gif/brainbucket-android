
import React, { useState, useRef } from 'react';
import {
  CheckSquare,
  Lightbulb,
  Bookmark,
  Plus,
  ChevronDown,
  Sparkles,
  Grid3X3,
  X,
  Download,
  Link as LinkIcon,
  Paperclip,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Capture, QuickTemplate, MediaItem } from '../types';

const typeIcons = {
  task: CheckSquare,
  idea: Lightbulb,
  reference: Bookmark,
};

const typeColors = {
  task: 'bg-blue-500',
  idea: 'bg-green-500',
  reference: 'bg-gray-500',
};

export function QuickCapture() {
  const { state, dispatch } = useApp();
  const [text, setText] = useState('');
  const [selectedType, setSelectedType] = useState<'task' | 'idea' | 'reference'>('task');
  // Selected bucket; defaults to the unsorted bucket id.  When unsorted is selected
  // captures will live in the global unsorted bucket.
  const [selectedBucket, setSelectedBucket] = useState('unsorted');
  // If a bucket other than unsorted is selected, the user may optionally
  // choose a folder within that bucket.  An empty string indicates no folder.
  const [selectedFolder, setSelectedFolder] = useState('');
  // Allow the capture to include arbitrary links and file attachments.  Links are
  // simple strings; attachments are stored temporarily as File objects and
  // transformed into MediaItem entries when the capture is saved.
  const [links, setLinks] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickTemplate | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check PWA install status
  React.useEffect(() => {
    console.log('PWA install effect running...');
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isInWebAppiOS;
    
    console.log('Install status check:', {
      isStandalone,
      isInWebAppiOS,
      isInstalled,
      userAgent: navigator.userAgent,
      deferredPrompt: !!(window as any).deferredPrompt
    });
    });

  // Check for shared content from Android
  React.useEffect(() => {
if (window.Android && window.Android.getSharedText) {
  const sharedText = window.Android.getSharedText();
      if (sharedText) {
        setText(sharedText);
      }
    }
  }, []);

  
  setIsInstalled(isInstalled);
    setIsInstalled(isInstalled);
    
    // Show install button by default for testing
    if (!isInstalled) {
      setCanInstall(true);
    }
    
    // Listen for install prompt availability
    const handleInstallAvailable = () => {
      console.log('Install prompt available');
      console.log('Setting canInstall to true');
      setCanInstall(true);
    };
    
    const handleInstalled = () => {
      console.log('App installed');
      setIsInstalled(true);
      setCanInstall(false);
    };
    
    const handleAppInstalled = () => {
      console.log('appinstalled event fired');
      setIsInstalled(true);
      setCanInstall(false);
    };
    
    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Check if prompt is already available
    if ((window as any).deferredPrompt) {
      console.log('deferredPrompt already available on mount');
      setCanInstall(true);
    }
    
    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };

  const handleInstallClick = () => {
    console.log('Install button clicked');
    console.log('deferredPrompt available:', !!(window as any).deferredPrompt);
    console.log('User agent:', navigator.userAgent);
    console.log('Is standalone:', window.matchMedia('(display-mode: standalone)').matches);
    
    if ((window as any).deferredPrompt) {
      const deferredPrompt = (window as any).deferredPrompt;
      console.log('Calling prompt()...');
      deferredPrompt.prompt();
      
      deferredPrompt.userChoice.then((choiceResult: any) => {
        console.log('User choice:', choiceResult.outcome);
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setIsInstalled(true);
        } else {
          console.log('User dismissed the install prompt');
        }
        (window as any).deferredPrompt = null;
      });
    } else {
      // Fallback instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      let instructions = 'To install this app:\n\n';
      
      if (isIOS) {
        instructions += '1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"';
      } else if (isAndroid) {
        instructions += '1. Tap the menu button (⋮)\n2. Tap "Add to Home screen" or "Install app"\n3. Tap "Add" or "Install"';
      } else {
        instructions += '1. Look for an install icon in your browser\'s address bar\n2. Or check your browser\'s menu for "Install" or "Add to Home Screen"';
      }
      
      alert(instructions);
    }
  };

  const handleAddCapture = () => {
    // Ignore empty submissions
    if (!text.trim()) return;

    // Use the selected bucket as-is; the "unsorted" option maps directly to
    // the unsorted bucket in the app state.
    const bucketId = selectedBucket;

    // Construct MediaItem entries from the selected files.  URLs are created
    // using URL.createObjectURL.  The id is derived from the current
    // timestamp and file index to avoid collisions.
    const media: MediaItem[] = mediaFiles.map((file, idx) => {
      const type: MediaItem['type'] = file.type.startsWith('image/') ? 'image' : 'document';
      return {
        id: `${Date.now()}-${idx}`,
        type,
        url: URL.createObjectURL(file),
        name: file.name,
      };
    });

    const newCapture: Capture = {
      id: Date.now().toString(),
      text: text.trim(),
      type: selectedType,
      bucketId,
      // Assign folderId only when a non-empty folder selection exists
      folderId: selectedFolder || undefined,
      isStarred: false,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Persist optional links and media if provided
      links: links.length > 0 ? links : undefined,
      media: media.length > 0 ? media : undefined,
    };

    dispatch({ type: 'ADD_CAPTURE', payload: newCapture });

    // Reset form fields
    setText('');
    setSelectedFolder('');
    setLinks([]);
    setMediaFiles([]);
  };

  const handleTemplateItemClick = (item: string) => {
    setText(item);
    setExpandedTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    dispatch({ type: 'DELETE_TEMPLATE', payload: templateId });
  };

  const handleEditTemplate = (template: QuickTemplate) => {
    setEditingTemplate(template);
  };
  // Prompt the user for a URL and add it to the local list of links.  The
  // prompt is a simple browser prompt; more advanced UI can be added later.
  const handleAddLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    const trimmed = url.trim();
    if (trimmed) {
      setLinks((prev) => [...prev, trimmed]);
    }
  };

  // Trigger the hidden file input element when the user clicks the
  // attachment button.  This allows the browser to present a native file
  // picker.  When files are chosen, they are appended to the mediaFiles
  // state.
  const handleAttachmentButton = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setMediaFiles((prev) => [...prev, ...newFiles]);
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };
  const handleBucketsView = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'buckets' });
  };

  const handleSearchView = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  return (
    // Add bottom padding so content is not obscured by the sticky navigation
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900">Quick Capture</h1>
          
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBucketsView}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Grid3X3 className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Text Input */}
        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-24 resize-none border-none outline-none text-gray-900 placeholder-gray-500 text-lg"
          />
        </div>

        {/* Type Selection */}
        <div className="grid grid-cols-3 gap-3">
          {(['task', 'idea', 'reference'] as const).map((type) => {
            const Icon = typeIcons[type];
            const isSelected = selectedType === type;
            
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${typeColors[type]} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-sm font-medium capitalize ${
                  isSelected ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bucket Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add to bucket:
          </label>
          <div className="relative">
            <select
              value={selectedBucket}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedBucket(value);
                // Reset folder when bucket changes so that a stale folder isn't reused
                setSelectedFolder('');
              }}
              className="w-full p-3 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {/* Ensure the unsorted bucket always appears first */}
              {state.buckets.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Folder Selection (only when a specific bucket is chosen) */}
        {selectedBucket !== 'unsorted' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add to folder:
            </label>
            <div className="relative">
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Inbox (no folder)</option>
                {state.folders
                  .filter((folder) => folder.bucketId === selectedBucket)
                  .sort((a, b) => a.order - b.order)
                  .map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Links and Attachments */}
        <div className="mt-4 space-y-2">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleAddLink}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LinkIcon className="w-4 h-4 mr-1" />
              Add link
            </button>
            <button
              type="button"
              onClick={handleAttachmentButton}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Paperclip className="w-4 h-4 mr-1" />
              Add attachment
            </button>
            {/* Hidden file input for attachments */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {/* Display added links */}
          {links.length > 0 && (
            <div className="flex flex-col space-y-1">
              {links.map((link, idx) => (
                <div key={idx} className="text-sm text-blue-600 underline break-all">
                  {link}
                </div>
              ))}
            </div>
          )}
          {/* Display selected attachments */}
          {mediaFiles.length > 0 && (
            <div className="flex flex-col space-y-1">
              {mediaFiles.map((file, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Templates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Quick Task Templates:</span>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
              onClick={() => setShowNewTemplateModal(true)}>
              + New
            </button>
          </div>
          
          <div className="space-y-2">
            {state.templates.map((template) => {
              const Icon = template.icon === 'Sparkles' ? Sparkles : CheckSquare;
              const isExpanded = expandedTemplate === template.id;
              
              return (
                <div key={template.id} className="bg-white rounded-lg border border-gray-200">
                  <button
                    onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: template.color }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-gray-900">{template.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                        className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                      >
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {template.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                        >
                          <button
                            onClick={() => handleTemplateItemClick(item)}
                            className="flex-1 text-left text-sm text-gray-700"
                          >
                            {item}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updatedItems = template.items.filter((_, i) => i !== index);
                              const updatedTemplate = { ...template, items: updatedItems };
                              dispatch({ type: 'UPDATE_TEMPLATE', payload: updatedTemplate });
                            }}
                            className="p-1 hover:bg-red-100 rounded-full transition-colors ml-2"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newItem = prompt('Enter new template item:');
                          if (newItem && newItem.trim()) {
                            const updatedItems = [...template.items, newItem.trim()];
                            const updatedTemplate = { ...template, items: updatedItems };
                            dispatch({ type: 'UPDATE_TEMPLATE', payload: updatedTemplate });
                          }
                        }}
                        className="w-full p-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors border border-dashed border-blue-300"
                      >
                        + Add Item
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddCapture}
          disabled={!text.trim()}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
            text.trim()
              ? 'bg-blue-500 hover:bg-blue-600 shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Add Capture</span>
          </div>
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex justify-around">
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' })}
            className="flex flex-col items-center py-2 px-4 text-blue-600"
          >
            <Plus className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Capture</span>
          </button>
          <button
            onClick={handleSearchView}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs font-medium">Search</span>
          </button>
          <button
            onClick={handleBucketsView}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Grid3X3 className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Buckets</span>
          </button>
        </div>
      </div>

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <NewTemplateModal onClose={() => setShowNewTemplateModal(false)} />
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <EditTemplateModal 
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)} 
        />
      )}
    </div>
  );
}

function NewTemplateModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('CheckSquare');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [items, setItems] = useState<string[]>(['']);

  const icons = [
    { name: 'CheckSquare', component: CheckSquare },
    { name: 'Sparkles', component: Sparkles },
    { name: 'Lightbulb', component: Lightbulb },
    { name: 'Plus', component: Plus },
  ];

  const colors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#6b7280', '#ec4899', '#84cc16', '#f97316'
  ];

  const handleAddItem = () => {
    setItems([...items, '']);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validItems = items.filter(item => item.trim());
    if (validItems.length === 0) return;

    const newTemplate: QuickTemplate = {
      id: Date.now().toString(),
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      items: validItems,
    };

    dispatch({ type: 'ADD_TEMPLATE', payload: newTemplate });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Create Template</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter template name..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <div className="grid grid-cols-4 gap-2">
                {icons.map((icon) => {
                  const IconComponent = icon.component;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setSelectedIcon(icon.name)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        selectedIcon === icon.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 text-gray-700 mx-auto" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      selectedColor === color
                        ? 'border-gray-400 scale-110'
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Template Items
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter task item..."
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Template
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditTemplateModal({ template, onClose }: { template: QuickTemplate; onClose: () => void }) {
  const { dispatch } = useApp();
  const [name, setName] = useState(template.name);
  const [selectedIcon, setSelectedIcon] = useState(template.icon);
  const [selectedColor, setSelectedColor] = useState(template.color);
  const [items, setItems] = useState<string[]>([...template.items]);

  const icons = [
    { name: 'CheckSquare', component: CheckSquare },
    { name: 'Sparkles', component: Sparkles },
    { name: 'Lightbulb', component: Lightbulb },
    { name: 'Plus', component: Plus },
  ];

  const colors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#6b7280', '#ec4899', '#84cc16', '#f97316'
  ];

  const handleAddItem = () => {
    setItems([...items, '']);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validItems = items.filter(item => item.trim());
    if (validItems.length === 0) return;

    const updatedTemplate: QuickTemplate = {
      ...template,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      items: validItems,
    };

    dispatch({ type: 'UPDATE_TEMPLATE', payload: updatedTemplate });
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this template?')) {
      dispatch({ type: 'DELETE_TEMPLATE', payload: template.id });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Edit Template</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter template name..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <div className="grid grid-cols-4 gap-2">
                {icons.map((icon) => {
                  const IconComponent = icon.component;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setSelectedIcon(icon.name)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        selectedIcon === icon.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 text-gray-700 mx-auto" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      selectedColor === color
                        ? 'border-gray-400 scale-110'
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Template Items
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter task item..."
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete Template
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}