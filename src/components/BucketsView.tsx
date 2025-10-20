import React, { useState } from 'react';
import {
  CheckSquare,
  Palette,
  ShoppingCart,
  Lightbulb,
  Lock,
  Heart,
  Plus,
  ArrowLeft,
  Star,
  Grid3X3,
  Inbox,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Bucket } from '../types';

const iconMap = {
  CheckSquare,
  Palette,
  ShoppingCart,
  Lightbulb,
  Lock,
  Heart,
  Plus,
  Inbox,
};

export function BucketsView() {
  const { state, dispatch } = useApp();
  const [showNewBucketModal, setShowNewBucketModal] = useState(false);

  const handleBucketClick = (bucketId: string) => {
    dispatch({ type: 'SET_ACTIVE_BUCKET', payload: bucketId });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'bucket-detail' });
  };

  const handleBackToCapture = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' });
  };

  const handleSearchView = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  return (
    // Apply bottom padding to ensure content is not hidden behind the sticky nav
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 safe-top">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToCapture}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Buckets</h1>
          </div>
          <button
            onClick={() => setShowNewBucketModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Buckets Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4">
          {state.buckets.map((bucket) => {
            const IconComponent = iconMap[bucket.icon as keyof typeof iconMap] || CheckSquare;
            
            return (
              <button
                key={bucket.id}
                onClick={() => handleBucketClick(bucket.id)}
                className="relative bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all"
              >
                {/* Inbox Indicator */}
                {bucket.hasInboxItems && (
                  <div className="absolute top-3 right-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                )}
                
                <div className="flex flex-col items-center space-y-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: bucket.color }}
                  >
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 mb-1">{bucket.name}</h3>
                    <p className="text-sm text-gray-500">
                      {bucket.itemCount} item{bucket.itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex justify-around">
          <button
            onClick={handleBackToCapture}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
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
          <button className="flex flex-col items-center py-2 px-4 text-blue-600">
            <Grid3X3 className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Buckets</span>
          </button>
        </div>
      </div>

      {/* New Bucket Modal */}
      {showNewBucketModal && (
        <NewBucketModal onClose={() => setShowNewBucketModal(false)} />
      )}
    </div>
  );
}

function NewBucketModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('CheckSquare');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');

  const icons = [
    'CheckSquare', 'Palette', 'ShoppingCart', 'Lightbulb', 'Lock', 'Heart'
  ];

  const colors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#6b7280', '#ec4899', '#84cc16', '#f97316'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newBucket: Bucket = {
      id: Date.now().toString(),
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      hasInboxItems: false,
      itemCount: 0,
    };

    dispatch({ type: 'ADD_BUCKET', payload: newBucket });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Bucket</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bucket Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter bucket name..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((icon) => {
                const IconComponent = iconMap[icon as keyof typeof iconMap];
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedIcon === icon
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 text-gray-700" />
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
              Create Bucket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}