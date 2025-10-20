import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  Star,
  CheckSquare,
  Square,
  Calendar,
  Folder,
  Tag,
  Link,
  Image,
  FileText,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils/dateUtils';

export function CaptureView() {
  const { state, dispatch } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  const capture = state.captures.find(c => c.id === state.activeCaptureId);
  if (!capture) {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' });
    return null;
  }

  const bucket = state.buckets.find(b => b.id === capture.bucketId);
  const folder = capture.folderId 
    ? state.folders.find(f => f.id === capture.folderId)
    : null;

  const handleBack = () => {
    if (state.activeBucketId) {
      if (state.activeFolderId) {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'folder-detail' });
      } else {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'bucket-detail' });
      }
    } else {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' });
    }
  };

  const handleEdit = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture-edit' });
  };

  const handleToggleStar = () => {
    dispatch({ type: 'TOGGLE_STAR', payload: capture.id });
  };

  const handleToggleComplete = () => {
    dispatch({ type: 'TOGGLE_COMPLETE', payload: capture.id });
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_CAPTURE', payload: capture.id });
    handleBack();
  };

  const getTypeIcon = () => {
    switch (capture.type) {
      case 'task':
        return CheckSquare;
      case 'idea':
        return '💡';
      case 'reference':
        return '📑';
      default:
        return FileText;
    }
  };

  const getTypeColor = () => {
    switch (capture.type) {
      case 'task':
        return 'bg-blue-100 text-blue-800';
      case 'idea':
        return 'bg-green-100 text-green-800';
      case 'reference':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 safe-top">
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
            <h1 className="text-xl font-semibold text-gray-900">Capture</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleStar}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Star className={`w-5 h-5 ${
                capture.isStarred ? 'text-yellow-500 fill-current' : 'text-gray-400'
              }`} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                  <button
                    onClick={() => {
                      handleEdit();
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Type and Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor()}`}>
                {capture.type.charAt(0).toUpperCase() + capture.type.slice(1)}
              </span>
              
              {capture.type === 'task' && (
                <button
                  onClick={handleToggleComplete}
                  className="flex items-center space-x-2"
                >
                  {capture.isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={`text-sm ${
                    capture.isCompleted ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {capture.isCompleted ? 'Completed' : 'Pending'}
                  </span>
                </button>
              )}
            </div>
            
            {capture.isStarred && (
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
            )}
          </div>

          {/* Main Text */}
          <div className="mb-6">
            <h2 className={`text-xl font-semibold text-gray-900 mb-3 ${
              capture.isCompleted ? 'line-through opacity-60' : ''
            }`}>
              {capture.text}
            </h2>
            
            {capture.description && (
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {capture.description}
                </p>
              </div>
            )}
          </div>

          {/* Media */}
          {capture.media && capture.media.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Attachments</h3>
              <div className="grid grid-cols-2 gap-3">
                {capture.media.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (item.type === 'link') {
                        window.open(item.url, '_blank');
                      } else {
                        // For files, open in new tab or download
                        const link = document.createElement('a');
                        link.href = item.url;
                        link.target = '_blank';
                        link.download = item.name;
                        link.click();
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {item.type === 'image' ? (
                          <div className="relative">
                            <img 
                              src={item.url} 
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded border"
                            />
                          </div>
                        ) : item.type === 'document' ? (
                          <FileText className="w-5 h-5 text-red-600" />
                        ) : (
                          <Link className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {item.type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {capture.links && capture.links.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Links</h3>
              <div className="space-y-2">
                {capture.links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Link className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600 text-sm truncate">{link}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Organization */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Organization</h3>
            <div className="space-y-3">
              {bucket && (
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Bucket:</span> {bucket.name}
                  </span>
                </div>
              )}
              
              {folder && (
                <div className="flex items-center space-x-3">
                  <Folder className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Folder:</span> {folder.name}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Created:</span> {formatDate(new Date(capture.createdAt))}
                </span>
              </div>
              
              {capture.updatedAt !== capture.createdAt && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Updated:</span> {formatDate(new Date(capture.updatedAt))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <div className="mt-6">
          <button
            onClick={handleEdit}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Edit3 className="w-5 h-5" />
            <span>Edit Capture</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex justify-around">
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' })}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
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