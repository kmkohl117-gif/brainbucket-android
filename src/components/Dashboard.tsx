import React from 'react';
import {
  FileText,
  CheckSquare,
  Clock,
  TrendingUp,
  Calendar,
  Target,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils/dateUtils';

export function Dashboard() {
  const { state } = useApp();

  const completedTasks = state.tasks.filter(task => task.completed).length;
  const pendingTasks = state.tasks.filter(task => !task.completed).length;
  const overdueTasks = state.tasks.filter(task => 
    !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
  ).length;

  const recentNotes = state.notes
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const upcomingTasks = state.tasks
    .filter(task => !task.completed && task.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const stats = [
    {
      title: 'Total Notes',
      value: state.notes.length,
      icon: FileText,
      color: 'blue',
      description: 'Ideas captured',
    },
    {
      title: 'Active Tasks',
      value: pendingTasks,
      icon: CheckSquare,
      color: 'purple',
      description: 'Tasks to complete',
    },
    {
      title: 'Completed',
      value: completedTasks,
      icon: Target,
      color: 'green',
      description: 'Tasks finished',
    },
    {
      title: 'Overdue',
      value: overdueTasks,
      icon: Clock,
      color: 'red',
      description: 'Need attention',
    },
  ];

  const getStatColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'green':
        return 'from-green-500 to-green-600';
      case 'red':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}!
        </h2>
        <p className="text-gray-600">Here's what's happening in your brain bucket today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getStatColor(
                    stat.color
                  )} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Notes</h3>
            </div>
          </div>
          <div className="p-6">
            {recentNotes.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No notes yet</p>
                <p className="text-sm text-gray-400">Start capturing your ideas!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                          {note.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {note.content}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatDate(new Date(note.updatedAt))}</span>
                          {note.tags.length > 0 && (
                            <span>• {note.tags.length} tag{note.tags.length > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
            </div>
          </div>
          <div className="p-6">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No upcoming tasks</p>
                <p className="text-sm text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          task.priority === 'high'
                            ? 'bg-red-500'
                            : task.priority === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                          {task.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                          {task.description}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {task.dueDate && (
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </span>
                          )}
                          <span>• {task.priority} priority</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}