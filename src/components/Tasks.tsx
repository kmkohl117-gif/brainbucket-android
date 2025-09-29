import React, { useState } from 'react';
import {
  Plus,
  CheckSquare,
  Square,
  Clock,
  Flag,
  MoreHorizontal,
  Edit3,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Task } from '../types';
import { formatDueDate } from '../utils/dateUtils';

export function Tasks() {
  const { state, dispatch } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredTasks = state.tasks.filter((task) => {
    const matchesSearch = state.searchQuery === '' || 
      task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()));
    
    const matchesCategory = !state.selectedCategory || task.category === state.selectedCategory;
    
    const matchesFilter = filter === 'all' || 
      (filter === 'pending' && !task.completed) ||
      (filter === 'completed' && task.completed);
    
    return matchesSearch && matchesCategory && matchesFilter;
  });

  const handleCreateTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskData.title || '',
      description: taskData.description || '',
      completed: false,
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate,
      category: taskData.category || state.selectedCategory || '1',
      tags: taskData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
    setShowCreateModal(false);
  };

  const handleUpdateTask = (taskData: Partial<Task>) => {
    if (editingTask) {
      const updatedTask: Task = {
        ...editingTask,
        ...taskData,
        updatedAt: new Date(),
      };
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      setEditingTask(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  };

  const handleToggleTask = (taskId: string) => {
    dispatch({ type: 'TOGGLE_TASK', payload: taskId });
  };

  const pendingTasks = filteredTasks.filter(task => !task.completed);
  const completedTasks = filteredTasks.filter(task => task.completed);

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
            <span>New Task</span>
          </button>
          
          <div className="flex items-center space-x-2">
            {(['all', 'pending', 'completed'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <CheckSquare className="w-4 h-4" />
          <span>{filteredTasks.length} tasks</span>
        </div>
      </div>

      {/* Tasks Lists */}
      <div className="space-y-6">
        {/* Pending Tasks */}
        {(filter === 'all' || filter === 'pending') && pendingTasks.length > 0 && (
          <TaskSection
            title="Pending Tasks"
            tasks={pendingTasks}
            onToggle={handleToggleTask}
            onEdit={setEditingTask}
            onDelete={handleDeleteTask}
          />
        )}

        {/* Completed Tasks */}
        {(filter === 'all' || filter === 'completed') && completedTasks.length > 0 && (
          <TaskSection
            title="Completed Tasks"
            tasks={completedTasks}
            onToggle={handleToggleTask}
            onEdit={setEditingTask}
            onDelete={handleDeleteTask}
          />
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-4">
              {state.searchQuery 
                ? "Try adjusting your search terms"
                : "Start organizing your work and goals"}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create your first task
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTask) && (
        <TaskModal
          task={editingTask}
          onSave={editingTask ? handleUpdateTask : handleCreateTask}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { state } = useApp();
  
  const category = state.categories.find(cat => cat.id === task.category);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
      task.completed ? 'opacity-75' : ''
    } ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {task.completed ? (
            <CheckSquare className="w-5 h-5 text-green-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`font-medium text-gray-900 mb-1 ${
                task.completed ? 'line-through' : ''
              }`}>
                {task.title}
              </h4>
              {task.description && (
                <p className={`text-sm text-gray-600 mb-3 ${
                  task.completed ? 'line-through' : ''
                }`}>
                  {task.description}
                </p>
              )}

              {/* Meta information */}
              <div className="flex items-center space-x-4 text-xs">
                {/* Priority */}
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                  <Flag className="w-3 h-3" />
                  <span className="font-medium">{task.priority}</span>
                </div>

                {/* Due Date */}
                {task.dueDate && (
                  <div className={`flex items-center space-x-1 ${
                    isOverdue ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>{formatDueDate(new Date(task.dueDate))}</span>
                  </div>
                )}

                {/* Category */}
                {category && (
                  <div className="flex items-center space-x-1 text-gray-500">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                )}

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div className="flex space-x-1">
                    {task.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {task.tags.length > 2 && (
                      <span className="text-gray-500">+{task.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Menu */}
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
                      onEdit(task);
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      onDelete(task.id);
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
      </div>
    </div>
  );
}

function TaskModal({
  task,
  onSave,
  onClose,
}: {
  task?: Task | null;
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}) {
  const { state } = useApp();
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [category, setCategory] = useState(task?.category || state.selectedCategory || '1');
  const [tags, setTags] = useState(task?.tags.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      category,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {task ? 'Edit Task' : 'Create New Task'}
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
                placeholder="Enter task title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task description..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                {task ? 'Update' : 'Create'} Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}