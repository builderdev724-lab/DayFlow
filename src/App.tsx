import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CirclePlus,
  Clock3,
  Download,
  ListChecks,
  Moon,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Sun,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { TaskModal } from "./components/TaskModal";
import { TaskCard } from "./components/TaskCard";
import { db } from "./lib/api";
import type { Task, TaskInput } from "./types/task";
import "./styles.css";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = iso(new Date());
const displayDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
const monthLabel = (date: string) =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
}
function minutes(t: Task) {
  const [sh, sm] = t.startTime.split(":").map(Number);
  const [eh, em] = t.endTime.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}
function timeMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function formatDuration(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

type View = "plan" | "history" | "settings";
type Theme = "light" | "dark";
type DayPart = "morning" | "day" | "evening" | "night";

const DEFAULT_SETTINGS = {
  defaultReminder: 10,
  notifications: true,
  focusNotify: true,
};
const quotes = [
  "Do less, better.",
  "One focused block at a time.",
  "Small steps become momentum.",
  "A clear day gives work room to breathe.",
];

function getDayPart() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "day";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function monthCells(date: string) {
  const current = new Date(`${date}T12:00:00`);
  const year = current.getFullYear();
  const month = current.getMonth();
  const first = new Date(year, month, 1);
  const total = new Date(year, month + 1, 0).getDate();
  const start = (first.getDay() + 6) % 7;
  const cells: Array<{ date: string; day: number; outside: boolean }> = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(year, month, i - start + 1);
    cells.push({
      date: iso(d),
      day: d.getDate(),
      outside: d.getMonth() !== month,
    });
  }
  return cells.slice(0, 42);
}

export default function App() {
  const [date, setDate] = useState(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<Task[]>([]);
  const [view, setView] = useState<View>("plan");
  const [modal, setModal] = useState<{ open: boolean; task?: Task | null }>({
    open: false,
    task: null,
  });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("dayflow-theme") as Theme) || "light",
  );
  const [search, setSearch] = useState("");
  const [focusSeconds, setFocusSeconds] = useState(
    () => Number(localStorage.getItem("dayflow-focus-seconds")) || 25 * 60,
  );
  const [focusPreset, setFocusPreset] = useState(
    () => Number(localStorage.getItem("dayflow-focus-minutes")) || 25,
  );
  const [focusRunning, setFocusRunning] = useState(false);
  const [customFocus, setCustomFocus] = useState("40");
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("dayflow-theme", theme);
  }, [theme]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await db.listTasks(date));
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await db.listHistory(100));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory, tasks]);
  useEffect(() => {
    try {
      const local = JSON.parse(
        localStorage.getItem("dayflow-settings") || "{}",
      );
      db.getNotificationsEnabled()
        .then((enabled) =>
          setSettings({
            ...DEFAULT_SETTINGS,
            ...local,
            notifications: enabled,
          }),
        )
        .catch(() => undefined);
    } catch {
      /* keep defaults */
    }
  }, []);

  // Native reminders are scheduled by the Rust background worker, so they continue when the window is hidden.
  useEffect(() => {
    localStorage.setItem("dayflow-focus-seconds", String(focusSeconds));
    localStorage.setItem("dayflow-focus-minutes", String(focusPreset));
  }, [focusSeconds, focusPreset]);

  useEffect(() => {
    if (!focusRunning) return;
    const id = window.setInterval(() => {
      setFocusSeconds((seconds) => {
        if (seconds <= 1) {
          setFocusRunning(false);
          if (settings.focusNotify && settings.notifications)
            void db.sendFocusNotification(
              "Focus complete",
              "Your focus session is finished. Take a short break.",
            );
          return focusPreset * 60;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusRunning, focusPreset, settings.focusNotify, settings.notifications]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("task-search")?.focus();
      }
      if (!typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setView("plan");
        setModal({ open: true, task: null });
      }
      if (event.key === "Escape") setModal({ open: false, task: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const save = async (input: TaskInput) => {
    if (modal.task) await db.updateTask(modal.task.id, input);
    else await db.createTask(input);
    await load();
  };

  const status = async (id: number, next: Task["status"]) => {
    await db.updateStatus(id, next);
    await load();
  };
  const remove = async (id: number) => {
    if (window.confirm("Delete this task?")) {
      await db.deleteTask(id);
      await load();
    }
  };

  const ordered = useMemo(
    () =>
      [...tasks]
        .filter((task) =>
          `${task.title} ${task.notes} ${task.category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [tasks, search],
  );

  const completed = tasks.filter((task) => task.status === "completed").length;
  const active = tasks.filter((task) => task.status === "in-progress").length;
  const totalMinutes = tasks.reduce((sum, task) => sum + minutes(task), 0);
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const remaining = Math.max(0, tasks.length - completed);
  const focusLabel = `${pad(Math.floor(focusSeconds / 60))}:${pad(focusSeconds % 60)}`;
  const dayPart = getDayPart();
  const cells = monthCells(date);
  const quote = quotes[new Date().getDate() % quotes.length];
  const nowMins = clock.getHours() * 60 + clock.getMinutes();

  const setFocus = (minutesValue: number) => {
    setFocusPreset(minutesValue);
    setFocusSeconds(minutesValue * 60);
    setFocusRunning(false);
  };

  const startFocus = () => {
    if (focusRunning) {
      setFocusRunning(false);
      return;
    }
    if (settings.focusNotify && settings.notifications)
      void db.sendFocusNotification(
        "Focus started",
        `${focusPreset}-minute focus session started.`,
      );
    setFocusRunning(true);
  };

  const persistSettings = (next: typeof settings) => {
    setSettings(next);
    localStorage.setItem("dayflow-settings", JSON.stringify(next));
  };

  const toggleNotifications = async () => {
    const next = !settings.notifications;
    await db.setNotificationsEnabled(next);
    persistSettings({ ...settings, notifications: next });
  };

  const testNotification = async () => {
    try {
      await db.sendTestNotification();
    } catch (error) {
      window.alert(`Dayflow could not send the notification. ${String(error)}`);
    }
  };

  const exportBackup = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), tasks: history },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dayflow-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const heroImages: Record<DayPart, string> = {
    morning: "/assets/dayflow-morning.jpg",
    day: "/assets/dayflow-day.jpg",
    evening: "/assets/dayflow-evening.jpg",
    night: "/assets/dayflow-night.jpg",
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          
            <img src="/src-tauri/icons/32x32.png" alt="Dayflow Logo" />
          
          <div>
            <strong>Dayflow</strong>
            <small>Plan today. Build tomorrow.</small>
          </div>
        </div>

        <nav className="nav-main">
          <button
            className={`nav-item ${view === "plan" ? "active" : ""}`}
            onClick={() => setView("plan")}
          >
            <CalendarDays size={18} /> <span>Today</span>
          </button>
          <button
            className={`nav-item ${view === "history" ? "active" : ""}`}
            onClick={() => setView("history")}
          >
            <ListChecks size={18} /> <span>History</span>
          </button>
        </nav>

        <div className="sidebar-label">WORKFLOW</div>
        <button
          className="nav-item nav-muted"
          onClick={() => setView("settings")}
        >
          <Settings2 size={18} /> <span>Settings</span>
        </button>

        <div className="sidebar-spacer" />
        <div className="sidebar-quote">
          <span>“</span>
          <p>{quote}</p>
          <small>Dayflow</small>
        </div>
        <button
          className="theme-switch"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          <span className="theme-switch-icon">
            {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
          </span>
          <span>{theme === "light" ? "Light mode" : "Dark mode"}</span>
          <span className={`theme-track ${theme === "dark" ? "is-dark" : ""}`}>
            <span />
          </span>
        </button>
        <div className="local-note">
          <span className="status-dot" />
          Local only<div>SQLite · private on this device</div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="date-nav">
            <button
              className="icon-button"
              onClick={() => setDate(shift(date, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="date-picker">
              <CalendarDays size={15} />
              <span>{displayDate(date)}</span>
              {date === today && <b>Today</b>}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <button
              className="icon-button"
              onClick={() => setDate(shift(date, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                id="task-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your plan…"
              />
              <kbd>Ctrl K</kbd>
            </div>
            {view === "plan" && (
              <button
                className="button primary"
                onClick={() => setModal({ open: true, task: null })}
              >
                <CirclePlus size={17} /> Add task <kbd>N</kbd>
              </button>
            )}
          </div>
        </header>

        {view === "plan" && (
          <div className="page-wrap">
            <section
              className={`hero-banner ${dayPart}`}
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(9,23,44,.78) 0%, rgba(16,31,52,.38) 52%, rgba(16,31,52,.02) 100%), url(${heroImages[dayPart]})`,
              }}
            >
              <div className="hero-copy">
                <span className="eyebrow">
                  {dayPart === "night" ? "TONIGHT" : "YOUR DAY"}
                </span>
                <h1>
                  {date === today
                    ? `Good ${dayPart === "morning" ? "morning" : dayPart === "day" ? "afternoon" : dayPart === "evening" ? "evening" : "night"}.`
                    : displayDate(date)}
                </h1>
                <p>
                  {tasks.length
                    ? `${tasks.length} scheduled · ${completed} complete · ${active} in progress`
                    : "Plan the next thing. Then the next."}
                </p>
              </div>
             
            </section>

            <section className="stat-grid">
              <div className="stat-card blue">
                <div className="stat-icon">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <strong>
                    {completed}/{tasks.length}
                  </strong>
                  <span>Completed</span>
                </div>
                <small>{progress}%</small>
              </div>
              <div className="stat-card peach">
                <div className="stat-icon">
                  <Clock3 size={18} />
                </div>
                <div>
                  <strong>{formatDuration(totalMinutes)}</strong>
                  <span>Planned time</span>
                </div>
                <small>{active ? `${active} active` : "On plan"}</small>
              </div>
              <div className="stat-card yellow">
                <div className="stat-icon">
                  <Zap size={18} />
                </div>
                <div>
                  <strong>{remaining}</strong>
                  <span>Tasks remaining</span>
                </div>
                <small>{tasks.length ? "Keep moving" : "Start small"}</small>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">
                  <BellRing size={18} />
                </div>
                <div>
                  <strong>{settings.notifications ? "On" : "Off"}</strong>
                  <span>Native reminders</span>
                </div>
                <small>Linux</small>
              </div>
            </section>

            <div className="workspace-grid">
              <section className="main-column">
                <div className="section-head">
                  <div>
                    <div className="section-title-row">
                      <h2>Today’s plan</h2>
                      <span>
                        {tasks.length
                          ? `${tasks.length} tasks`
                          : "Open schedule"}
                      </span>
                    </div>
                    <p>Work in blocks. Keep the next step obvious.</p>
                  </div>
                  <div className="notification-hint">
                    <Bell size={14} />{" "}
                    {settings.notifications ? "Reminders on" : "Reminders off"}
                  </div>
                </div>

                <section className="timeline">
                  <div
                    className="timeline-now"
                    style={{
                      display: date === today ? undefined : "none",
                      top: `${Math.max(14, Math.min(98, ((nowMins - 6 * 60) / (18 * 60)) * 100))}%`,
                    }}
                  >
                    <span>
                      {clock.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <i />
                  </div>
                  {loading ? (
                    <div className="empty">
                      <div className="empty-icon blue">
                        <Clock3 size={23} />
                      </div>
                      <h3>Loading your plan</h3>
                      <p>Getting your schedule from local storage.</p>
                    </div>
                  ) : ordered.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon palette">
                        <CalendarDays size={23} />
                      </div>
                      <h3>
                        {search ? "No matching tasks" : "Your schedule is open"}
                      </h3>
                      <p>
                        {search
                          ? "Try another keyword."
                          : "Add a block and give your day a shape."}
                      </p>
                      {!search && (
                        <button
                          className="button primary"
                          onClick={() => setModal({ open: true, task: null })}
                        >
                          Add your first task
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {ordered.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isCurrent={
                            date === today &&
                            nowMins >= timeMinutes(task.startTime) &&
                            nowMins < timeMinutes(task.endTime)
                          }
                          onStatus={(next) => void status(task.id, next)}
                          onEdit={() => setModal({ open: true, task })}
                          onDelete={() => void remove(task.id)}
                        />
                      ))}
                      <button
                        className="add-inline"
                        onClick={() => setModal({ open: true, task: null })}
                      >
                        <CirclePlus size={17} /> Add another task
                      </button>
                    </>
                  )}
                </section>
              </section>

              <aside className="right-rail">
                <div className="rail-card calendar-card">
                  <div className="rail-head">
                    <div>
                      <strong>{monthLabel(date)}</strong>
                      <span>Choose a planning day</span>
                    </div>
                    <div className="rail-nav">
                      <button onClick={() => setDate(shift(date, -28))}>
                        <ChevronLeft size={14} />
                      </button>
                      <button onClick={() => setDate(shift(date, 28))}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="calendar-grid weekdays">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <span key={`${d}-${i}`}>{d}</span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {cells.map((cell) => (
                      <button
                        key={cell.date}
                        className={`${cell.outside ? "outside" : ""} ${cell.date === date ? "selected" : ""} ${cell.date === today ? "today" : ""}`}
                        onClick={() => setDate(cell.date)}
                      >
                        {cell.day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rail-card focus-card">
                  <div className="rail-head">
                    <div>
                      <strong>Focus</strong>
                      <span>One protected block of deep work</span>
                    </div>
                    <Timer size={17} />
                  </div>
                  <div className="focus-timer-row">
                    <div className="focus-time">{focusLabel}</div>
                    <div
                      className={`focus-status ${focusRunning ? "running" : ""}`}
                    >
                      {focusRunning ? "Running" : "Ready"}
                    </div>
                  </div>
                  <div className="focus-bar">
                    <span
                      style={{
                        width: `${(focusSeconds / (focusPreset * 60)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="focus-presets">
                    {[15, 25, 50].map((value) => (
                      <button
                        key={value}
                        className={focusPreset === value ? "selected" : ""}
                        onClick={() => setFocus(value)}
                      >
                        {value}m
                      </button>
                    ))}
                    <button
                      className={
                        focusPreset !== 15 &&
                        focusPreset !== 25 &&
                        focusPreset !== 50
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        const v = Math.max(
                          5,
                          Math.min(180, Number(customFocus) || 40),
                        );
                        setFocus(v);
                      }}
                    >
                      Custom
                    </button>
                  </div>
                  <div className="focus-custom">
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={customFocus}
                      onChange={(e) => setCustomFocus(e.target.value)}
                    />
                    <span>minutes</span>
                  </div>
                  <button
                    className={`button focus-button ${focusRunning ? "pause" : ""}`}
                    onClick={startFocus}
                  >
                    {focusRunning ? (
                      <Pause size={15} />
                    ) : (
                      <Play size={15} fill="currentColor" />
                    )}{" "}
                    {focusRunning ? "Pause focus" : "Start focus"}
                  </button>
                  <label className="focus-notify">
                    <input
                      type="checkbox"
                      checked={settings.focusNotify}
                      onChange={(e) =>
                        persistSettings({
                          ...settings,
                          focusNotify: e.target.checked,
                        })
                      }
                    />
                    <span>Notify me when the focus session ends</span>
                  </label>
                </div>

                <div className="rail-card quick-card">
                  <div className="rail-head">
                    <div>
                      <strong>Today at a glance</strong>
                      <span>Simple signal, no clutter</span>
                    </div>
                    <MoreHorizontal size={16} />
                  </div>
                  <div className="quick-row">
                    <span className="quick-dot blue" />
                    <span>Completed</span>
                    <strong>{completed}</strong>
                  </div>
                  <div className="quick-row">
                    <span className="quick-dot orange" />
                    <span>In progress</span>
                    <strong>{active}</strong>
                  </div>
                  <div className="quick-row">
                    <span className="quick-dot yellow" />
                    <span>Remaining</span>
                    <strong>{remaining}</strong>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}

        {view === "history" && (
          <section className="page-section">
            <div className="section-intro">
              <div>
                <span className="eyebrow">ACTIVITY</span>
                <h1>What got done.</h1>
                <p>Completed and skipped tasks stay on this device.</p>
              </div>
              <button className="button ghost" onClick={exportBackup}>
                <Download size={16} /> Export backup
              </button>
            </div>
            <div className="history-list">
              {history.length ? (
                history.map((task) => (
                  <div className="history-row" key={task.id}>
                    <div className={`history-marker ${task.status}`}>
                      <CheckCircle2 size={15} />
                    </div>
                    <div className="history-main">
                      <strong>{task.title}</strong>
                      <span>
                        {shortDate(task.date)} · {task.startTime}–{task.endTime}{" "}
                        · {task.category}
                      </span>
                    </div>
                    <span className={`priority-pill ${task.priority}`}>
                      <span className="priority-dot" />
                      {task.priority}
                    </span>
                    <button
                      className="mini-icon"
                      onClick={() => {
                        setDate(task.date);
                        setView("plan");
                      }}
                    >
                      <CalendarDays size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty compact">
                  <div className="empty-icon yellow">
                    <ListChecks size={22} />
                  </div>
                  <h3>No history yet</h3>
                  <p>Finish a task and it will appear here.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {view === "settings" && (
          <section className="page-section settings-page">
            <div className="section-intro">
              <div>
                <span className="eyebrow">PREFERENCES</span>
                <h1>Make Dayflow yours.</h1>
                <p>Everything is local. Nothing needs an account.</p>
              </div>
            </div>
            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-icon blue">
                  <BellRing size={18} />
                </div>
                <div>
                  <strong>Native task reminders</strong>
                  <span>
                    Run from the desktop app and keep notifying while the window
                    is hidden.
                  </span>
                </div>
                <button
                  className={`toggle ${settings.notifications ? "on" : ""}`}
                  onClick={() => void toggleNotifications()}
                >
                  <span />
                </button>
              </div>
              <div className="setting-row">
                <div className="setting-icon peach">
                  <AlarmClock size={18} />
                </div>
                <div>
                  <strong>Default task reminder</strong>
                  <span>New tasks inherit this interval.</span>
                </div>
                <select
                  value={settings.defaultReminder}
                  onChange={(e) =>
                    persistSettings({
                      ...settings,
                      defaultReminder: Number(e.target.value),
                    })
                  }
                >
                  <option value={0}>At start</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
              <div className="setting-row">
                <div className="setting-icon yellow">
                  <Sun size={18} />
                </div>
                <div>
                  <strong>Appearance</strong>
                  <span>
                    Switch between the bright daytime canvas and the dark
                    evening workspace.
                  </span>
                </div>
                <button
                  className="appearance-button"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                  {theme === "light" ? "Light mode" : "Dark mode"}{" "}
                  {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              </div>
              <div className="setting-row">
                <div className="setting-icon green">
                  <Bell size={18} />
                </div>
                <div>
                  <strong>Test Linux notifications</strong>
                  <span>
                    Use the native Ubuntu notification service directly.
                  </span>
                </div>
                <button
                  className="button subtle"
                  onClick={() => void testNotification()}
                >
                  Send test
                </button>
              </div>
              <div className="setting-row">
                <div className="setting-icon orange">
                  <Download size={18} />
                </div>
                <div>
                  <strong>Local backup</strong>
                  <span>
                    Export your task history as JSON so you can keep your own
                    backups.
                  </span>
                </div>
                <button className="button subtle" onClick={exportBackup}>
                  Export
                </button>
              </div>
            </div>
          </section>
        )}

        <TaskModal
          open={modal.open}
          initial={modal.task}
          date={date}
          defaultReminder={settings.defaultReminder}
          onClose={() => setModal({ open: false, task: null })}
          onSave={save}
        />
      </main>
    </div>
  );
}
