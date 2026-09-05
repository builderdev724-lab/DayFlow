use chrono::{Local, Timelike};
use notify_rust::Notification;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{fs, thread, time::Duration};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WindowEvent,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub notes: String,
    pub date: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
    pub priority: String,
    pub category: String,
    pub status: String,
    #[serde(rename = "remindBefore")]
    pub remind_before: i64,
    #[serde(rename = "reminderSent")]
    pub reminder_sent: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TaskInput {
    pub title: String,
    pub notes: String,
    pub date: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
    pub priority: String,
    pub category: String,
    #[serde(rename = "remindBefore")]
    pub remind_before: i64,
}

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("dayflow.sqlite3"))
}

fn connection(app: &AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| e.to_string())?;
    Ok(conn)
}

fn init_db(app: &AppHandle) -> Result<(), String> {
    let conn = connection(app)?;
    conn.execute_batch(
        r#"
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        category TEXT NOT NULL DEFAULT 'General',
        status TEXT NOT NULL DEFAULT 'planned',
        remind_before INTEGER NOT NULL DEFAULT 10,
        reminder_sent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT OR IGNORE INTO settings(key, value) VALUES ('notifications_enabled', '1');
    "#,
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn row_to_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        notes: row.get(2)?,
        date: row.get(3)?,
        start_time: row.get(4)?,
        end_time: row.get(5)?,
        priority: row.get(6)?,
        category: row.get(7)?,
        status: row.get(8)?,
        remind_before: row.get(9)?,
        reminder_sent: row.get::<_, i64>(10)? != 0,
        created_at: row.get(11)?,
    })
}

#[tauri::command]
fn list_tasks(app: AppHandle, date: String) -> Result<Vec<Task>, String> {
    let conn = connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id,title,notes,date,start_time,end_time,priority,category,status,remind_before,reminder_sent,created_at FROM tasks WHERE date=?1 ORDER BY start_time ASC, id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([date], row_to_task)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_history(app: AppHandle, limit: i64) -> Result<Vec<Task>, String> {
    let conn = connection(&app)?;
    let safe_limit = limit.clamp(1, 200);
    let mut stmt = conn
        .prepare("SELECT id,title,notes,date,start_time,end_time,priority,category,status,remind_before,reminder_sent,created_at FROM tasks WHERE status IN ('completed','skipped') ORDER BY date DESC, start_time DESC, id DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([safe_limit], row_to_task)
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn validate(input: &TaskInput) -> Result<(), String> {
    if input.title.trim().is_empty() {
        return Err("Task name is required.".into());
    }
    if input.end_time <= input.start_time {
        return Err("End time must be after start time.".into());
    }
    if !matches!(
        input.priority.as_str(),
        "low" | "medium" | "high" | "urgent"
    ) {
        return Err("Invalid priority.".into());
    }
    if !(0..=1440).contains(&input.remind_before) {
        return Err("Invalid reminder interval.".into());
    }
    Ok(())
}

#[tauri::command]
fn create_task(app: AppHandle, input: TaskInput) -> Result<Task, String> {
    validate(&input)?;
    let conn = connection(&app)?;
    let now = Local::now().to_rfc3339();
    conn.execute(
        "INSERT INTO tasks(title,notes,date,start_time,end_time,priority,category,status,remind_before,reminder_sent,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,'planned',?8,0,?9)",
        params![
            input.title.trim(),
            input.notes,
            input.date,
            input.start_time,
            input.end_time,
            input.priority,
            input.category.trim(),
            input.remind_before,
            now
        ],
    )
    .map_err(|e| e.to_string())?;
    get_task(&conn, conn.last_insert_rowid())
}

#[tauri::command]
fn update_task(app: AppHandle, id: i64, input: TaskInput) -> Result<Task, String> {
    validate(&input)?;
    let conn = connection(&app)?;
    conn.execute(
        "UPDATE tasks SET title=?1,notes=?2,date=?3,start_time=?4,end_time=?5,priority=?6,category=?7,remind_before=?8,reminder_sent=0 WHERE id=?9",
        params![
            input.title.trim(),
            input.notes,
            input.date,
            input.start_time,
            input.end_time,
            input.priority,
            input.category.trim(),
            input.remind_before,
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    get_task(&conn, id)
}

fn get_task(conn: &Connection, id: i64) -> Result<Task, String> {
    conn.query_row(
        "SELECT id,title,notes,date,start_time,end_time,priority,category,status,remind_before,reminder_sent,created_at FROM tasks WHERE id=?1",
        [id],
        row_to_task,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_task_status(app: AppHandle, id: i64, status: String) -> Result<Task, String> {
    if !matches!(
        status.as_str(),
        "planned" | "in-progress" | "completed" | "skipped"
    ) {
        return Err("Invalid task status.".into());
    }
    let conn = connection(&app)?;
    let reset = matches!(status.as_str(), "planned" | "in-progress");
    conn.execute(
        "UPDATE tasks SET status=?1, reminder_sent=CASE WHEN ?3 THEN 0 ELSE reminder_sent END WHERE id=?2",
        params![status, id, reset],
    )
    .map_err(|e| e.to_string())?;
    get_task(&conn, id)
}

#[tauri::command]
fn delete_task(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = connection(&app)?;
    conn.execute("DELETE FROM tasks WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_notifications_enabled(app: AppHandle) -> Result<bool, String> {
    let conn = connection(&app)?;
    let value: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key='notifications_enabled'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(value == "1")
}

#[tauri::command]
fn set_notifications_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    let conn = connection(&app)?;
    conn.execute(
        "INSERT INTO settings(key,value) VALUES('notifications_enabled',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        [if enabled { "1" } else { "0" }],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn show_notification(title: &str, body: &str) -> Result<(), String> {
    Notification::new()
        .appname("Dayflow")
        .summary(title)
        .body(body)
        .timeout(notify_rust::Timeout::Milliseconds(6000))
        .show()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn send_test_notification() -> Result<(), String> {
    show_notification("Dayflow", "Native Linux notifications are working.")
}

#[tauri::command]
fn send_focus_notification(title: String, body: String) -> Result<(), String> {
    show_notification(&title, &body)
}

fn parse_hm(value: &str) -> Option<i64> {
    let mut parts = value.split(':');
    let hour = parts.next()?.parse::<i64>().ok()?;
    let minute = parts.next()?.parse::<i64>().ok()?;
    Some(hour * 60 + minute)
}

fn start_reminder_worker(app: AppHandle) {
    thread::spawn(move || loop {
        if let Ok(conn) = connection(&app) {
            let enabled = conn
                .query_row(
                    "SELECT value FROM settings WHERE key='notifications_enabled'",
                    [],
                    |r| r.get::<_, String>(0),
                )
                .map(|v| v == "1")
                .unwrap_or(false);

            if enabled {
                let now = Local::now();
                let date = now.format("%Y-%m-%d").to_string();
                let now_minutes = i64::from(now.hour()) * 60 + i64::from(now.minute());
                let mut stmt = match conn.prepare("SELECT id,title,start_time,remind_before,status,reminder_sent FROM tasks WHERE date=?1 AND status NOT IN ('completed','skipped') AND reminder_sent=0") {
                    Ok(stmt) => stmt,
                    Err(_) => {
                        thread::sleep(Duration::from_secs(15));
                        continue;
                    }
                };

                let rows = stmt.query_map([date.as_str()], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, i64>(3)?,
                    ))
                });

                if let Ok(rows) = rows {
                    for row in rows.flatten() {
                        let (id, title, start_time, remind_before) = row;
                        let Some(start_minutes) = parse_hm(&start_time) else {
                            continue;
                        };
                        let trigger = start_minutes - remind_before;
                        if now_minutes >= trigger && now_minutes <= start_minutes {
                            let body = if remind_before > 0 {
                                format!("{} · starts in {} min", title, remind_before)
                            } else {
                                format!("{} · starts now", title)
                            };
                            if show_notification("Dayflow", &body).is_ok() {
                                let _ = conn
                                    .execute("UPDATE tasks SET reminder_sent=1 WHERE id=?1", [id]);
                            }
                        }
                    }
                }
            }
        }
        thread::sleep(Duration::from_secs(15));
    });
}

fn tray_icon() -> tauri::image::Image<'static> {
    let size = 32usize;
    let mut px = vec![0u8; size * size * 4];
    for y in 2..30 {
        for x in 2..30 {
            let dx = if x < 16 { 15 - x } else { x - 16 };
            let dy = if y < 16 { 15 - y } else { y - 16 };
            if dx.max(dy) < 14 {
                let t = ((x * 3 + y * 2) % 30) as u8;
                let i = (y * size + x) * 4;
                px[i] = 91u8.saturating_add(t);
                px[i + 1] = 147u8.saturating_add(t / 2);
                px[i + 2] = 244u8.saturating_add(t / 5);
                px[i + 3] = 255;
            }
        }
    }
    for (cx, cy, r, color) in [
        (19, 13, 4, (255, 238, 166)),
        (23, 18, 4, (255, 177, 112)),
        (16, 20, 3, (255, 255, 255)),
    ] {
        for y in (cy - r)..=(cy + r) {
            for x in (cx - r)..=(cx + r) {
                if (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r {
                    let i = (y as usize * size + x as usize) * 4;
                    px[i] = color.0;
                    px[i + 1] = color.1;
                    px[i + 2] = color.2;
                    px[i + 3] = 255;
                }
            }
        }
    }
    tauri::image::Image::new_owned(px, size as u32, size as u32)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            init_db(app.handle())?;
            start_reminder_worker(app.handle().clone());
            let show = MenuItem::with_id(app, "show", "Open Dayflow", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            let handle = app.handle().clone();
            TrayIconBuilder::new()
                .icon(tray_icon())
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => handle.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_tasks,
            list_history,
            get_notifications_enabled,
            set_notifications_enabled,
            send_test_notification,
            send_focus_notification,
            create_task,
            update_task,
            update_task_status,
            delete_task
        ])
        .run(tauri::generate_context!())
        .expect("error while running Dayflow");
}
