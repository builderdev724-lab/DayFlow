import { Check, Circle, Clock3, Pencil, Play, RotateCcw, SkipForward, Trash2 } from 'lucide-react';
import type { Task } from '../types/task';

interface Props { task: Task; isCurrent?: boolean; onStatus: (s: Task['status']) => void; onEdit: () => void; onDelete: () => void; }
const priorityLabel = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as const;
const statusLabel = { planned: 'Planned', 'in-progress': 'In progress', completed: 'Completed', skipped: 'Skipped' } as const;
function duration(start: string, end: string) { const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number); const mins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm)); return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`; }
function taskImage(task: Task) {
  const value = `${task.category} ${task.title}`.toLowerCase();
  if (/work|billing|code|dev|git|project/.test(value)) return '/assets/task-work.png';
  if (/study|learn|read|college|exam|book/.test(value)) return '/assets/task-study.png';
  if (/personal|health|life/.test(value)) return '/assets/task-personal.png';
  return '/assets/task-general.png';
}

export function TaskCard({ task, isCurrent, onStatus, onEdit, onDelete }: Props) {
  const completed = task.status === 'completed';
  const skipped = task.status === 'skipped';
  return <article className={`task-card priority-${task.priority} ${completed ? 'is-complete' : ''} ${skipped ? 'is-skipped' : ''} ${isCurrent ? 'is-current' : ''}`}>
    <div className="task-time"><span>{task.startTime}</span><small>{task.endTime}</small></div>
    <div className="timeline-rail"><span className="timeline-dot" /></div>
    <div className="task-main">
      <div className="task-content">
        <div className="task-topline">
        <div className="task-title-row">
          <button className={`check ${completed ? 'checked' : ''}`} onClick={() => onStatus(completed ? 'planned' : 'completed')} aria-label={completed ? 'Mark incomplete' : 'Mark complete'}>{completed ? <Check size={13} /> : <Circle size={16} />}</button>
          <div className="task-title-block"><h3>{task.title}</h3><span className="task-duration"><Clock3 size={12} /> {task.startTime}–{task.endTime} · {duration(task.startTime, task.endTime)}</span></div>
        </div>
            <div className="task-menu"><button className="mini-icon" onClick={onEdit} aria-label="Edit task"><Pencil size={15} /></button><button className="mini-icon" onClick={() => onStatus(skipped ? 'planned' : 'skipped')} aria-label={skipped ? 'Restore task' : 'Skip task'}>{skipped ? <RotateCcw size={15} /> : <SkipForward size={15} />}</button><button className="mini-icon danger" onClick={onDelete} aria-label="Delete task"><Trash2 size={15} /></button></div>
        </div>
        {task.notes && <p className="task-notes">{task.notes}</p>}
        <div className="task-meta"><span className={`priority-pill ${task.priority}`}><span className="priority-dot" />{priorityLabel[task.priority]}</span><span className="category-chip">{task.category}</span><span className="status-chip"><Clock3 size={12} /> {statusLabel[task.status]}</span></div>
        <div className="task-actions">{task.status === 'planned' && <button className="start-button" onClick={() => onStatus('in-progress')}><Play size={13} fill="currentColor" /> Start</button>}{task.status === 'in-progress' && <button className="start-button active" onClick={() => onStatus('completed')}><Check size={13} /> Finish</button>}{(completed || skipped) && <button className="start-button" onClick={() => onStatus('planned')}><RotateCcw size={13} /> Restore</button>}<span className="task-reminder"><Clock3 size={11} /> {task.remindBefore === 0 ? 'At start' : `${task.remindBefore} min before`}</span></div>
      </div>
      <div className="task-art"><img src={taskImage(task)} alt="" loading="lazy" /></div>
    </div>
  </article>;
}