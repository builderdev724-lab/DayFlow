import { useEffect, useState } from 'react';
import { Bell, Clock3, X } from 'lucide-react';
import type { Priority, Task, TaskInput } from '../types/task';

interface Props {
  open: boolean;
  initial?: Task | null;
  date: string;
  defaultReminder: number;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
}

const makeEmpty = (date: string, reminder: number): TaskInput => ({
  title: '', notes: '', date, startTime: '09:00', endTime: '10:00', priority: 'medium', category: 'General', remindBefore: reminder,
});

export function TaskModal({ open, initial, date, defaultReminder, onClose, onSave }: Props) {
  const [form, setForm] = useState<TaskInput>(makeEmpty(date, defaultReminder));
  const [saving, setSaving] = useState(false);
  const invalidTime = form.endTime <= form.startTime;

  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      title: initial.title, notes: initial.notes, date: initial.date, startTime: initial.startTime,
      endTime: initial.endTime, priority: initial.priority, category: initial.category, remindBefore: initial.remindBefore,
    } : makeEmpty(date, defaultReminder));
  }, [open, initial, date, defaultReminder]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;
  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || invalidTime || !form.date) return;
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <div><span className="eyebrow">PLAN YOUR TIME</span><h2>{initial ? 'Edit task' : 'Add task'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>

        <label>Task name
          <input autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What are you working on?" />
        </label>

        <label>Notes
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional context, deliverable, or checklist…" rows={3} />
        </label>

        <div className="form-grid two">
          <label>Date<input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
          <label>Category<input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Work, study, personal…" /></label>
        </div>

        <div className="time-row">
          <label><span><Clock3 size={15} /> Start</span><input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></label>
          <span className="dash">—</span>
          <label><span>End</span><input className={invalidTime ? 'field-error' : ''} type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></label>
        </div>
        {invalidTime && <p className="form-error">End time must be later than the start time.</p>}

        <div className="priority-picker">
          <span className="form-label">Priority</span>
          <div className="priority-options">
            {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((priority) => (
              <button key={priority} type="button" className={`priority-option ${priority} ${form.priority === priority ? 'selected' : ''}`} onClick={() => set('priority', priority)}>
                <span className="priority-dot" />{priority[0].toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <label><span className="label-with-icon"><Bell size={14} /> Reminder</span>
          <select value={form.remindBefore} onChange={(e) => set('remindBefore', Number(e.target.value))}>
            <option value={0}>At start</option><option value={5}>5 min before</option><option value={10}>10 min before</option><option value={15}>15 min before</option><option value={30}>30 min before</option>
          </select>
        </label>

        <div className="modal-actions">
          <button className="button ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={saving || !form.title.trim() || invalidTime || !form.date}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Add task'}</button>
        </div>
      </form>
    </div>
  );
}
