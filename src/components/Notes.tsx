import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  MoreHorizontal,
  Edit3,
  Trash2,
  Tag,
  Calendar,
  FileText,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Note } from '../types';
import { formatDate } from '../utils/dateUtils';

export function Notes() {
  const { state, dispatch } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const filteredNotes = state.notes.filter((note) => {
    const matchesSearch = state.searchQuery === '' || 
      note.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()));
    
    const matchesCategory = !state.selectedCategory || note.category === state.selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const pinnedNotes = filteredNotes.filter(note => note.isPinned);
  const regularNotes = filteredNotes.filter(note => !note.isPinned);

  const handleCreateNote = (noteData: Partial<Note>) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: noteData.title || '',
      content: noteData.content || '',
      tags: noteData.tags || [],
      category: noteData.category || state.selectedCategory || '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
    };
    dispatch({ type: 'ADD_NOTE', payload: newNote });
    setShowCreateModal(false);
  };

  const handleUpdateNote = (noteData: Partial<Note>) => {
    if (editingNote) {
      const updatedNote: Note = {
        ...editingNote,
        ...noteData,
        updatedAt: new Date(),
      };
      dispatch({ type: 'UPDATE_NOTE', payload: updatedNote });
      setEditingNote(null);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    dispatch({ type: 'DELETE_NOTE', payload: noteId });
  };

  const handleTogglePin = (noteId: string) => {
    dispatch({ type: 'TOGGLE_PIN_NOTE', payload: noteId });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span>{filteredNotes.length} notes</span>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="space-y-6">
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Pin className="w-5 h-5" />
              <span>Pinned Notes</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={setEditingNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Notes */}
        {regularNotes.length > 0 && (
          <div>
            {pinnedNotes.length > 0 && (
              <h3 className="text-lg font-semibold text-gray-900 mb-4">All Notes</h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {regularNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={setEditingNote}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
            <p className="text-gray-500 mb-4">
              {state.searchQuery 
                ? "Try adjusting your search terms"
                : "Start capturing your thoughts and ideas"}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create your first note
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingNote) && (
        <NoteModal
          note={editingNote}
          onSave={editingNote ? handleUpdateNote : handleCreateNote}
          onClose={() => {
            setShowCreateModal(false);
            setEditingNote(null);
          }}
        />
      )}
    </div>
  );
}

function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { state } = useApp();
  
  const category = state.categories.find(cat => cat.id === note.category);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{note.title}</h3>
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={() => {
                  onEdit(note);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  onTogglePin(note.id);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <Pin className="w-4 h-4" />
                <span>{note.isPinned ? 'Unpin' : 'Pin'}</span>
              </button>
              <button
                onClick={() => {
                  onDelete(note.id);
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

      {/* Content */}
      <p className="text-gray-600 text-sm line-clamp-3 mb-4">{note.content}</p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{note.tags.length - 3} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {category && (
            <div className="flex items-center space-x-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span>{category.name}</span>
            </div>
          )}
        </div>
        <span>{formatDate(new Date(note.updatedAt))}</span>
      </div>

      {/* Pin indicator */}
      {note.isPinned && (
        <div className="absolute top-2 right-2">
          <Pin className="w-4 h-4 text-blue-600 fill-current" />
        </div>
      )}
    </div>
  );
}

function NoteModal({
  note,
  onSave,
  onClose,
}: {
  note?: Note | null;
  onSave: (note: Partial<Note>) => void;
  onClose: () => void;
}) {
  const { state } = useApp();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState(note?.tags.join(', ') || '');
  const [category, setCategory] = useState(note?.category || state.selectedCategory || '1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim(),
      content: content.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      category,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {note ? 'Edit Note' : 'Create New Note'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter note title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write your note content here..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {state.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tag1, tag2, tag3"
                />
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
                {note ? 'Update' : 'Create'} Note
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}