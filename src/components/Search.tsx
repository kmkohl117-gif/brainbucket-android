import React from 'react';
import { Search as SearchIcon, FileText, CheckSquare, Calendar, Tag } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils/dateUtils';

export function Search() {
  const { state } = useApp();

  const searchResults = React.useMemo(() => {
    if (!state.searchQuery.trim()) return { notes: [], tasks: [] };

    const query = state.searchQuery.toLowerCase();
    
    const notes = state.notes.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );

    const tasks = state.tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.tags.some(tag => tag.toLowerCase().includes(query))
    );

    return { notes, tasks };
  }, [state.notes, state.tasks, state.searchQuery]);

  const totalResults = searchResults.notes.length + searchResults.tasks.length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <SearchIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Search Results</h2>
        </div>
        <p className="text-gray-600">
          {state.searchQuery ? (
            totalResults > 0 ? (
              <>Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{state.searchQuery}"</>
            ) : (
              <>No results found for "{state.searchQuery}"</>
            )
          ) : (
            'Enter a search query to find notes and tasks'
          )}
        </p>
      </div>

      {!state.searchQuery.trim() ? (
        <div className="text-center py-12">
          <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
          <p className="text-gray-500 mb-4">
            Use the search bar above to find notes, tasks, and tags
          </p>
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <h4 className="font-medium text-gray-900 mb-3">Search tips:</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Search for keywords in titles and content</li>
              <li>• Find items by tags</li>
              <li>• Search across both notes and tasks</li>
              <li>• Results update as you type</li>
            </ul>
          </div>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center py-12">
          <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500 mb-4">
            Try different keywords or check your spelling
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Notes Results */}
          {searchResults.notes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Notes ({searchResults.notes.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.notes.map((note) => (
                  <SearchNoteCard key={note.id} note={note} query={state.searchQuery} />
                ))}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {searchResults.tasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <CheckSquare className="w-5 h-5" />
                <span>Tasks ({searchResults.tasks.length})</span>
              </h3>
              <div className="space-y-3">
                {searchResults.tasks.map((task) => (
                  <SearchTaskCard key={task.id} task={task} query={state.searchQuery} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchNoteCard({ note, query }: { note: any; query: string }) {
  const { state } = useApp();
  const category = state.categories.find(cat => cat.id === note.category);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {highlightText(note.title, query)}
      </h4>
      <p className="text-gray-600 text-sm line-clamp-3 mb-3">
        {highlightText(note.content, query)}
      </p>
      
      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.slice(0, 3).map((tag: string, index: number) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
            >
              {highlightText(tag, query)}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{note.tags.length - 3} more</span>
          )}
        </div>
      )}

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
    </div>
  );
}

function SearchTaskCard({ task, query }: { task: any; query: string }) {
  const { state } = useApp();
  const category = state.categories.find(cat => cat.id === task.category);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${
      task.completed ? 'opacity-75' : ''
    }`}>
      <div className="flex items-start space-x-3">
        <CheckSquare className={`w-5 h-5 mt-1 ${
          task.completed ? 'text-green-600' : 'text-gray-400'
        }`} />
        
        <div className="flex-1">
          <h4 className={`font-medium text-gray-900 mb-1 ${
            task.completed ? 'line-through' : ''
          }`}>
            {highlightText(task.title, query)}
          </h4>
          
          {task.description && (
            <p className={`text-sm text-gray-600 mb-3 ${
              task.completed ? 'line-through' : ''
            }`}>
              {highlightText(task.description, query)}
            </p>
          )}

          <div className="flex items-center space-x-3 text-xs">
            <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            
            {task.dueDate && (
              <div className="flex items-center space-x-1 text-gray-600">
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            
            {category && (
              <div className="flex items-center space-x-1 text-gray-500">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span>{category.name}</span>
              </div>
            )}
          </div>

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.slice(0, 3).map((tag: string, index: number) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                >
                  {highlightText(tag, query)}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{task.tags.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}