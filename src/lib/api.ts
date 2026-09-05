import { invoke } from '@tauri-apps/api/core';
import type { Task, TaskInput } from '../types/task';

export const db = {
  listTasks: (date: string) => invoke<Task[]>('list_tasks', { date }),
  listHistory: (limit = 50) => invoke<Task[]>('list_history', { limit }),
  getNotificationsEnabled: () => invoke<boolean>('get_notifications_enabled'),
  setNotificationsEnabled: (enabled: boolean) => invoke<void>('set_notifications_enabled', { enabled }),
  sendTestNotification: () => invoke<void>('send_test_notification'),
  sendFocusNotification: (title: string, body: string) => invoke<void>('send_focus_notification', { title, body }),
  createTask: (input: TaskInput) => invoke<Task>('create_task', { input }),
  updateTask: (id: number, input: TaskInput) => invoke<Task>('update_task', { id, input }),
  updateStatus: (id: number, status: Task['status']) => invoke<Task>('update_task_status', { id, status }),
  deleteTask: (id: number) => invoke<void>('delete_task', { id }),
};
