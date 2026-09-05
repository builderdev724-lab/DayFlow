export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'planned' | 'in-progress' | 'completed' | 'skipped';

export interface Task {
  id: number;
  title: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Priority;
  category: string;
  status: TaskStatus;
  remindBefore: number;
  reminderSent: boolean;
  createdAt: string;
}

export interface TaskInput {
  title: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Priority;
  category: string;
  remindBefore: number;
}
