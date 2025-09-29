import React from 'react';
import {
  Search as SearchIcon,
  ArrowLeft,
  Star,
  CheckSquare,
  Square,
  Plus,
  Grid3X3,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils/dateUtils';

export function SearchView() {
  const { state, dispatch } = useApp();

  const searchResults = React.useMemo(() => {
    if (!state.searchQuery.trim()) return [];

    const query = state.searchQuery.toLowerCase();
    
    return state.captures.filter(capture =>
      capture.text.toLowerCase().includes(query) ||
      (capture.description && capture.description.toLowerCase().includes(query))
    );
  }, [state.captures, state.searchQuery]);

  const handleBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'capture' });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value });
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
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center space-x-3 mb-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Search</h1>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your captures..."
            value={state.searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {!state.searchQuery.trim() ? (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
            <p className="text-gray-500 mb-4">
              Find your captures by typing keywords above
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 mb-4">
              Try different keywords or check your spelling
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </p>
            
            {searchResults.map((capture) => {
              const bucket = state.buckets.find(b => b.id === capture.bucketId);
              const folder = capture.folderId 
                ? state.folders.find(f => f.id === capture.folderId)
                : null;

              return (
                <div
                  key={capture.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    {/* Checkbox for tasks */}
                    {capture.type === 'task' && (
                      <button
                        onClick={() => handleToggleComplete(capture.id)}
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
                        onClick={() => handleCaptureClick(capture.id)}
                        className="text-left w-full"
                      >
                        <p className={`text-gray-900 mb-2 ${
                          capture.isCompleted ? 'line-through opacity-60' : ''
                        }`}>
                          {highlightText(capture.text, state.searchQuery)}
                        </p>
                        
                        {capture.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {highlightText(capture.description, state.searchQuery)}
                          </p>
                        )}

                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {bucket && (
                            <span className="flex items-center space-x-1">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: bucket.color }}
                              />
                              <span>{bucket.name}</span>
                            </span>
                          )}
                          {folder && (
                            <span>• {folder.name}</span>
                          )}
                          <span>• {formatDate(new Date(capture.updatedAt))}</span>
                        </div>
                      </button>
                    </div>

                    {/* Star */}
                    <button
                      onClick={() => handleToggleStar(capture.id)}
                      className="mt-1"
                    >
                      <Star className={`w-5 h-5 ${
                        capture.isStarred ? 'text-yellow-500 fill-current' : 'text-gray-400'
                      }`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
          <button className="flex flex-col items-center py-2 px-4 text-blue-600">
            <SearchIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Search</span>
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'buckets' })}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Grid3X3 className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Buckets</span>
          </button>
        </div>
      </div>
    </div>
  );
}