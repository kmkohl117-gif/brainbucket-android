import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Star,
  CheckSquare,
  Square,
  MoreHorizontal,
  Folder as FolderIcon,
  Grid3X3,
  GripVertical,
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
import { Folder as FolderType, Capture } from '../types';

export function BucketDetail() {
  const { state, dispatch } = useApp();
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState<string | null>(null);

  const bucket = state.buckets.find(b => b.id === state.activeBucketId);
  if (!bucket) return null;

  const bucketCaptures = state.captures.filter(c => c.bucketId === bucket.id);
  const inboxCaptures = bucketCaptures
    .filter(c => !c.folderId && !c.isCompleted)
    .sort((a, b) => {
      if (a.isStarred !== b.isStarred) return b.isStarred ? 1 : -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const bucketFolders = state.folders
    .filter(f => f.bucketId === bucket.id)
    .sort((a, b) => a.order - b.order);

  const handleBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'buckets' });
    dispatch({ type: 'SET_ACTIVE_BUCKET', payload: undefined });
  };

  const handleQuickCapture = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' });
  };

  const handleFolderClick = (folderId: string) => {
    dispatch({ type: 'SET_ACTIVE_FOLDER', payload: folderId });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'folder-detail' });
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
            <h1 className="text-xl font-semibold text-gray-900">{bucket.name}</h1>
          </div>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Inbox Section */}
        {inboxCaptures.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Inbox</h2>
            <div className="space-y-2">
              {inboxCaptures.map((capture) => (
                <CaptureItem
                  key={capture.id}
                  capture={capture}
                  onToggleStar={handleToggleStar}
                  onToggleComplete={handleToggleComplete}
                  onCaptureClick={handleCaptureClick}
                  onMoveClick={() => setShowMoveModal(capture.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Folders Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Folders</h2>
          <div className="grid grid-cols-2 gap-3">
            {bucketFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={() => handleFolderClick(folder.id)}
              />
            ))}
          </div>
        </div>

        {/* Empty State */}
        {inboxCaptures.length === 0 && bucketFolders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
            <p className="text-gray-500 mb-4">Start capturing ideas or create folders to organize</p>
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

      {/* Modals */}
      {showNewFolderModal && (
        <NewFolderModal
          bucketId={bucket.id}
          onClose={() => setShowNewFolderModal(false)}
        />
      )}

      {showMoveModal && (
        <MoveToFolderModal
          captureId={showMoveModal}
          bucketId={bucket.id}
          onClose={() => setShowMoveModal(null)}
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
}: {
  capture: Capture;
  onToggleStar: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onCaptureClick: (id: string) => void;
  onMoveClick: () => void;
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
                  onMoveClick();
                  setShowMenu(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Move to folder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderCard({
  folder,
  onClick,
}: {
  folder: FolderType;
  onClick: () => void;
}) {
  // Mapping of folder icon names to lucide-react components.  When adding new
  // icons here also import them at the top of this file.  If a folder
  // specifies an icon that does not exist in the map it will fall back to a
  // generic folder icon.
  const folderIconMap: Record<string, any> = {
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
  const IconComponent = folder.icon && folderIconMap[folder.icon]
    ? folderIconMap[folder.icon]
    : FolderIcon;
  // Lighten the background colour by adding an alpha channel.  If no colour
  // is specified default to a pale blue.
  const baseColor = folder.color || '#3b82f6';
  const bgColor = baseColor.length === 7 ? `${baseColor}1a` : baseColor;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-center space-x-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <IconComponent className="w-6 h-6" style={{ color: baseColor }} />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{folder.name}</h3>
          <p className="text-sm text-gray-500">
            {folder.itemCount} item{folder.itemCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </button>
  );
}

function NewFolderModal({
  bucketId,
  onClose,
}: {
  bucketId: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useApp();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');

  // Define a wider set of icons for folder creation.  When updating this
  // list, ensure corresponding components are imported at the top of this file.
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

    const existingFolders = state.folders.filter(f => f.bucketId === bucketId);
    const maxOrder = existingFolders.length > 0 
      ? Math.max(...existingFolders.map(f => f.order))
      : -1;

    const newFolder: FolderType = {
      id: Date.now().toString(),
      name: name.trim(),
      bucketId,
      order: maxOrder + 1,
      itemCount: 0,
      icon: selectedIcon,
      color: selectedColor,
    };

    dispatch({ type: 'ADD_FOLDER', payload: newFolder });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Folder</h2>
        
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

          {/* Icon selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((iconName) => {
                // Determine the component from the map in FolderCard's scope
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

          {/* Colour selection */}
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
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoveToFolderModal({
  captureId,
  bucketId,
  onClose,
}: {
  captureId: string;
  bucketId: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useApp();
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const capture = state.captures.find(c => c.id === captureId);
  if (!capture) return null;

  const availableFolders = state.folders.filter(f => f.bucketId === bucketId);

  const handleMove = () => {
    let targetFolderId = selectedFolder;

    // Create new folder if specified
    if (newFolderName.trim()) {
      const existingFolders = state.folders.filter(f => f.bucketId === bucketId);
      const maxOrder = existingFolders.length > 0 
        ? Math.max(...existingFolders.map(f => f.order))
        : -1;

      const newFolder: FolderType = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        bucketId: bucketId,
        order: maxOrder + 1,
        itemCount: 0,
        // Use a generic folder icon and a default colour when creating
        // folders via the Move modal.  Users can edit the folder later.
        icon: 'Folder',
        color: '#3b82f6',
      };

      dispatch({ type: 'ADD_FOLDER', payload: newFolder });
      targetFolderId = newFolder.id;
    }

    dispatch({
      type: 'MOVE_CAPTURE',
      payload: {
        captureId,
        bucketId: bucketId,
        folderId: targetFolderId || undefined,
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Move to Folder</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Folder
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Back to Inbox</option>
              {availableFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

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

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoveToBucketModal({
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

      const newFolder: FolderType = {
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Move to Bucket</h2>
        
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
              {state.buckets.filter(bucket => bucket.id !== capture.bucketId).map((bucket) => (
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