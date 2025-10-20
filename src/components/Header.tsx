import React from 'react';
import { Search, Plus, Bell, Settings } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function Header() {
  const { state, dispatch } = useApp();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value });
  };

  const getTitle = () => {
    switch (state.activeView) {
      case 'dashboard':
        return 'Dashboard';
      case 'notes':
        if (state.selectedCategory) {
          const category = state.categories.find(cat => cat.id === state.selectedCategory);
          return `${category?.name} Notes`;
        }
        return 'All Notes';
      case 'tasks':
        return 'Tasks';
      case 'search':
        return 'Search';
      default:
        return 'Brain Bucket';
    }
  };

  return (
<header
  className="bg-white border-b border-gray-200 px-6 py-4 pt-[calc(env(safe-area-inset-top,0px)+16px)]"
  style={{
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
  }}
>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {state.activeView === 'dashboard' && 'Your productivity overview'}
            {state.activeView === 'notes' && `${state.notes.length} notes captured`}
            {state.activeView === 'tasks' && `${state.tasks.filter(t => !t.completed).length} tasks pending`}
            {state.activeView === 'search' && 'Find anything in your brain bucket'}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search notes and tasks..."
              value={state.searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}