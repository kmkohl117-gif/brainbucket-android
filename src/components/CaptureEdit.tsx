import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  Star,
  CheckSquare,
  Square,
  Plus,
  X,
  Camera,
  FileText,
  Link,
  Trash2,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Capture, MediaItem } from '../types';

export function CaptureEdit() {
  const { state, dispatch } = useApp();
  
  const capture = state.captures.find(c => c.id === state.activeCaptureId);
  if (!capture) {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' });
    return null;
  }

  const [text, setText] = useState(capture.text);
  const [description, setDescription] = useState(capture.description || '');
  const [type, setType] = useState(capture.type);
  const [selectedBucket, setSelectedBucket] = useState(capture.bucketId);
  const [selectedFolder, setSelectedFolder] = useState(capture.folderId || '');
  const [isStarred, setIsStarred] = useState(capture.isStarred);
  const [isCompleted, setIsCompleted] = useState(capture.isCompleted);
  const [links, setLinks] = useState(capture.links || []);
  const [newLink, setNewLink] = useState('');
  const [media, setMedia] = useState(capture.media || []);

  const availableFolders = state.folders.filter(f => f.bucketId === selectedBucket);

  const handleBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture-view' });
  };

  const handleSave = () => {
    const updatedCapture: Capture = {
      ...capture,
      text: text.trim(),
      description: description.trim() || undefined,
      type,
      bucketId: selectedBucket,
      folderId: selectedFolder || undefined,
      isStarred,
      isCompleted,
      links: links.length > 0 ? links : undefined,
      media: media.length > 0 ? media : undefined,
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_CAPTURE', payload: updatedCapture });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture-view' });
  };

  const handleAddLink = () => {
    if (newLink.trim()) {
      setLinks([...links, newLink.trim()]);
      setNewLink('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleAddMedia = (type: 'image' | 'document') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt';
    input.multiple = false;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const newMediaItem: MediaItem = {
          id: Date.now().toString(),
          type,
          url,
          name: file.name,
        };
        setMedia([...media, newMediaItem]);
      }
    };
    
    input.click();
  };

  const handleRemoveMedia = (id: string) => {
    setMedia(media.filter(item => item.id !== id));
  };

  const getTypeColor = (captureType: string) => {
    switch (captureType) {
      case 'task':
        return 'bg-blue-500';
      case 'idea':
        return 'bg-green-500';
      case 'reference':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Edit Capture</h1>
          </div>
          
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              text.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Text Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-20 resize-none border-none outline-none text-gray-900 placeholder-gray-500"
            required
          />
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details..."
            className="w-full h-24 resize-none border-none outline-none text-gray-900 placeholder-gray-500"
          />
        </div>

        {/* Type Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['task', 'idea', 'reference'] as const).map((captureType) => (
              <button
                key={captureType}
                onClick={() => setType(captureType)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  type === captureType
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg ${getTypeColor(captureType)} mx-auto mb-2`} />
                <span className={`text-sm font-medium capitalize ${
                  type === captureType ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {captureType}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bucket Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bucket
          </label>
          <select
            value={selectedBucket}
            onChange={(e) => {
              setSelectedBucket(e.target.value);
              setSelectedFolder(''); // Reset folder when bucket changes
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {state.buckets.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.name}
              </option>
            ))}
          </select>
        </div>

        {/* Folder Selection */}
        {availableFolders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder (optional)
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No folder (Inbox)</option>
              {availableFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toggles */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="space-y-4">
            {/* Star Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Starred</span>
              <button
                onClick={() => setIsStarred(!isStarred)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Star className={`w-5 h-5 ${
                  isStarred ? 'text-yellow-500 fill-current' : 'text-gray-400'
                }`} />
              </button>
            </div>

            {/* Completion Toggle (only for tasks) */}
            {type === 'task' && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Completed</span>
                <button
                  onClick={() => setIsCompleted(!isCompleted)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Links</label>
          </div>
          
          {/* Add Link */}
          <div className="flex space-x-2 mb-3">
            <input
              type="url"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddLink}
              disabled={!newLink.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Links List */}
          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <Link className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-blue-600 truncate flex-1">{link}</span>
                  <button
                    onClick={() => handleRemoveLink(index)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Media</label>
            <div className="flex space-x-2">
              <button
                onClick={() => handleAddMedia('image')}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleAddMedia('document')}
                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media List */}
          {media.length > 0 && (
            <div className="space-y-2">
              {media.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {item.type === 'image' ? (
                      <div className="relative">
                        <img 
                          src={item.url} 
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded border"
                        />
                      </div>
                    ) : (
                      <FileText className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMedia(item.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex justify-around">
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' })}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Plus className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Capture</span>
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs font-medium">Search</span>
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'buckets' })}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-xs font-medium">Buckets</span>
          </button>
        </div>
      </div>
    </div>
  );
}