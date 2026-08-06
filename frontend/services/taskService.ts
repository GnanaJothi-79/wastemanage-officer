import { API_BASE } from './api';

export interface Task {
  id: number;
  task_id: string;
  bin_unit_id: number;
  worker_id: number;
  status: 'pending' | 'in-progress' | 'completed' | 'ignored' | 'reassigned';
  assigned_at: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ignored_count: number;
  zone?: string;  // Added zone field for quick lookup
}

// Get all tasks
export const getTasks = async (): Promise<Task[]> => {
  const response = await fetch(`${API_BASE}/tasks/`);
  if (!response.ok) throw new Error('Failed to fetch tasks');
  return response.json();
};

// Get tasks for a specific worker
export const getTasksForWorker = async (workerId: number): Promise<Task[]> => {
  const response = await fetch(`${API_BASE}/tasks/worker/${workerId}/`);
  if (!response.ok) throw new Error('Failed to fetch worker tasks');
  return response.json();
};

// Create a new task
export const createTask = async (task: Partial<Task>): Promise<Task> => {
  const response = await fetch(`${API_BASE}/tasks/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error('Create task error:', error);
    throw new Error('Failed to create task');
  }
  return response.json();
};

// Update a task
export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error('Update task error:', error);
    throw new Error('Failed to update task');
  }
  return response.json();
};

// Auto-assign task based on bin's zone (matches worker by zone)
export const autoAssignTask = async (binUnitId: number) => {
  const response = await fetch(`${API_BASE}/tasks/auto-assign/${binUnitId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.text();
    console.error('Auto-assign task error:', error);
    throw new Error(error || 'Failed to auto-assign task');
  }
  return response.json();
};

// Escalate a task (increment ignored count)
export const escalateTask = async (taskId: string) => {
  const tasks = await getTasks();
  const task = tasks.find(t => t.task_id === taskId);
  if (!task) throw new Error('Task not found');
  
  const newCount = (task.ignored_count || 0) + 1;
  return updateTask(taskId, { ignored_count: newCount });
};