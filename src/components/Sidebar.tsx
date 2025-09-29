import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Search,
  Plus,
  User,
  Briefcase,
  Lightbulb,
  BookOpen,
  Brain,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const iconMap = {
  User,
  Briefcase,
  Lightbulb,
  BookOpen,
};

export function Sidebar() {
  const { state, dispatch } = useApp();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'search', label: 'Search', icon: Search },
  ];

  const handleViewChange = (view: typeof state.activeView) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
    dispatch({ type: 'SET_SELECTED_CATEGORY', payload: null });
  };

  const handleCategoryClick = (categoryId: string) => {
    dispatch({ type: 'SET_SELECTED_CATEGORY', payload: categoryId });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'notes' });
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="flex items-center space-x-3 px-6 py-6 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Brain Bucket</h1>
          <p className="text-xs text-gray-500">Your digital mind palace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id as typeof state.activeView)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                state.activeView === item.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Categories */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Categories
          </h3>
          <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-1">
          {state.categories.map((category) => {
            const IconComponent = iconMap[category.icon as keyof typeof iconMap];
            const noteCount = state.notes.filter(note => note.category === category.id).length;
            const taskCount = state.tasks.filter(task => task.category === category.id).length;
            const totalCount = noteCount + taskCount;

            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  state.selectedCategory === category.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: category.color }}
                  >
                    {IconComponent && <IconComponent className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                {totalCount > 0 && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-4 py-4 border-t border-gray-100">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-2">Your productivity hub</p>
          <div className="flex space-x-4 text-xs text-gray-500">
            <span>{state.notes.length} notes</span>
            <span>{state.tasks.length} tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}