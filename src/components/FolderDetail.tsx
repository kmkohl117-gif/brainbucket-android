import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Star,
  CheckSquare,
  Square,
  MoreHorizontal,
  Edit3,
  Trash2,
  GripVertical,
  Grid3X3,
  Folder as FolderIcon,
  Bookmark,
  Music,
  Book,
  Camera,
  Briefcase,
  Calendar,
  Tag,
  Heart as HeartIcon,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Capture } from '../types';
import { formatDate } from '../utils/dateUtils';

export function FolderDetail() {
  const { state, dispatch } = useApp();
  const [showMoveModal, setShowMoveModal] = useState<string | null>(null);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);

  const folder = state.folders.find(f => f.id === state.activeFolderId);
  const bucket = folder ? state.buckets.find(b => b.id === folder.bucketId) : null;
  
  if (!folder || !bucket) {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'buckets' });
    return null;
  }

  const folderCaptures = state.captures
    .filter(c => c.folderId === folder.id)
    .sort((a, b) => {
      // Starred items first
      if (a.isStarred !== b.isStarred) return b.isStarred ? 1 : -1;
      // Then by updated date
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'bucket-detail' });
    dispatch({ type: 'SET_ACTIVE_FOLDER', payload: undefined });
  };

  const handleQuickCapture = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' });
  };

  const handleToggleStar = (captureId: string) => {
    dispatch({ type: 'TOGGLE_STAR', payload: captureId });
  };

  const handleToggleComplete = (captureId: string) => {
    dispatch({ type: 'TOGGLE_COMPLETE', payload: captureId });
  };

  const handleCaptureClick = (captureId: string) => {
    dispatch({ type: 'SET_ACTIVE_CAPTURE', payload: captureId });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture-view' });
  };

  const handleDeleteCapture = (captureId: string) => {
    dispatch({ type: 'DELETE_CAPTURE', payload: captureId });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 pt-[calc(env(safe-area-inset-top,0px)+48px)]">
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
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-semibold text-gray-900">{folder.name}</h1>
                <button
                  onClick={() => setShowEditFolderModal(true)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500">{bucket.name}</p>
            </div>
          </div>
          <button
            onClick={handleQuickCapture}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {folderCaptures.length > 0 ? (
          <div className="space-y-2">
            {folderCaptures.map((capture) => (
              <CaptureItem
                key={capture.id}
                capture={capture}
                onToggleStar={handleToggleStar}
                onToggleComplete={handleToggleComplete}
                onCaptureClick={handleCaptureClick}
                onMoveClick={() => setShowMoveModal(capture.id)}
                onDelete={handleDeleteCapture}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items in this folder</h3>
            <p className="text-gray-500 mb-4">Start adding captures to organize your thoughts</p>
            <button
              onClick={handleQuickCapture}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Item
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex justify-around">
          <button
            onClick={handleQuickCapture}
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
            className="flex flex-col items-center py-2 px-4 text-blue-600"
          >
            <Grid3X3 className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Buckets</span>
          </button>
        </div>
      </div>

      {/* Move Modal */}
      {showMoveModal && (
        <MoveModal
          captureId={showMoveModal}
          onClose={() => setShowMoveModal(null)}
        />
      )}

      {/* Edit Folder Modal */}
      {showEditFolderModal && folder && (
        <EditFolderModal
          folder={folder}
          onClose={() => setShowEditFolderModal(false)}
        />
      )}
    </div>
  );
}

function CaptureItem({
  capture,
  onToggleStar,
  onToggleComplete,
  onCaptureClick,
  onMoveClick,
  onDelete,
}: {
  capture: Capture;
  onToggleStar: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onCaptureClick: (id: string) => void;
  onMoveClick: () => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-start space-x-3">
        {/* Drag Handle */}
        <div className="mt-1">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Checkbox */}
        {capture.type === 'task' && (
          <button
            onClick={() => onToggleComplete(capture.id)}
            className="mt-1"
          >
            {capture.isCompleted ? (
              <CheckSquare className="w-5 h-5 text-green-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1">
          <button
            onClick={() => onCaptureClick(capture.id)}
            className="text-left w-full"
          >
            <p className={`text-gray-900 ${capture.isCompleted ? 'line-through opacity-60' : ''}`}>
              {capture.text}
            </p>
            {capture.description && (
              <p className="text-sm text-gray-600 mt-1">{capture.description}</p>
            )}
            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                capture.type === 'task' ? 'bg-blue-100 text-blue-800' :
                capture.type === 'idea' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {capture.type}
              </span>
              <span>{formatDate(new Date(capture.updatedAt))}</span>
            </div>
          </button>
        </div>

        {/* Star */}
        <button
          onClick={() => onToggleStar(capture.id)}
          className="mt-1"
        >
          <Star className={`w-5 h-5 ${
            capture.isStarred ? 'text-yellow-500 fill-current' : 'text-gray-400'
          }`} />
        </button>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={() => {
                  onCaptureClick(capture.id);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  onMoveClick();
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Move</span>
              </button>
              <button
                onClick={() => {
                  onDelete(capture.id);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MoveModal({
  captureId,
  onClose,
}: {
  captureId: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useApp();
  const [selectedBucket, setSelectedBucket] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const capture = state.captures.find(c => c.id === captureId);
  if (!capture) return null;

  const availableFolders = state.folders.filter(f => f.bucketId === selectedBucket);

  const handleMove = () => {
    let targetFolderId = selectedFolder;

    // Create new folder if specified
    if (newFolderName.trim()) {
      const existingFolders = state.folders.filter(f => f.bucketId === selectedBucket);
      const maxOrder = existingFolders.length > 0 
        ? Math.max(...existingFolders.map(f => f.order))
        : -1;

      const newFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        bucketId: selectedBucket,
        order: maxOrder + 1,
        itemCount: 0,
      };

      dispatch({ type: 'ADD_FOLDER', payload: newFolder });
      targetFolderId = newFolder.id;
    }

    dispatch({
      type: 'MOVE_CAPTURE',
      payload: {
        captureId,
        bucketId: selectedBucket,
        folderId: targetFolderId || undefined,
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Move Item</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Bucket
            </label>
            <select
              value={selectedBucket}
              onChange={(e) => {
                setSelectedBucket(e.target.value);
                setSelectedFolder('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose bucket...</option>
              {state.buckets.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </option>
              ))}
            </select>
          </div>

          {selectedBucket && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Folder (optional)
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {selectedBucket && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or create new folder
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="New folder name..."
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={!selectedBucket}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal component used to edit the properties of an existing folder.  Users can
// change the name, icon and colour.  The folder's id, bucket and order are
// preserved.  When submitted the updated folder is dispatched via the
// UPDATE_FOLDER action.
function EditFolderModal({
  folder,
  onClose,
}: {
  folder: FolderType;
  onClose: () => void;
}) {
  const { dispatch } = useApp();
  const [name, setName] = useState(folder.name);
  const [selectedIcon, setSelectedIcon] = useState(folder.icon || 'Folder');
  const [selectedColor, setSelectedColor] = useState(folder.color || '#3b82f6');

  const icons = [
    'Folder',
    'Star',
    'Bookmark',
    'Music',
    'Book',
    'Camera',
    'Briefcase',
    'Calendar',
    'Tag',
    'Heart',
    'CheckSquare',
  ];
  const colors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#6b7280', '#ec4899', '#84cc16', '#f97316', '#facc15', '#14b8a6', '#0ea5e9',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const updatedFolder: FolderType = {
      ...folder,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
    };
    dispatch({ type: 'UPDATE_FOLDER', payload: updatedFolder });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Folder</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter folder name..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((iconName) => {
                const map: Record<string, any> = {
                  Folder: FolderIcon,
                  Star,
                  Bookmark,
                  Music,
                  Book,
                  Camera,
                  Briefcase,
                  Calendar,
                  Tag,
                  Heart: HeartIcon,
                  CheckSquare,
                };
                const IconComp = map[iconName] || FolderIcon;
                const isActive = selectedIcon === iconName;
                return (
                  <button
                    type="button"
                    key={iconName}
                    onClick={() => setSelectedIcon(iconName)}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg border ${
                      isActive ? 'border-blue-500' : 'border-gray-300'
                    } hover:border-blue-400 transition-colors`}
                  >
                    <IconComp
                      className="w-5 h-5"
                      style={{ color: isActive ? selectedColor : '#6b7280' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colour
            </label>
            <div className="grid grid-cols-7 gap-2">
              {colors.map((color) => {
                const isActive = selectedColor === color;
                return (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      isActive ? 'border-blue-500' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}