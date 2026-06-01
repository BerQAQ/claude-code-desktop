use portable_pty::{native_pty_system, PtySize, CommandBuilder, MasterPty};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread::{self, JoinHandle};
use tauri::{AppHandle, Emitter};

// ── Global PTY registry ──
type PtyMap = Arc<Mutex<HashMap<String, PtyEntry>>>;

fn registry() -> &'static PtyMap {
    static MAP: OnceLock<PtyMap> = OnceLock::new();
    MAP.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

struct PtyEntry {
    master: Box<dyn MasterPty + Send>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
    _thread: JoinHandle<()>,
}

// ── Tauri Commands ──

#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("openpty failed: {}", e))?;

    // Build command: start cmd.exe in the project directory
    #[cfg(target_os = "windows")]
    let cmd = {
        let mut c = CommandBuilder::new("cmd.exe");
        c.cwd(&cwd);
        c
    };

    #[cfg(not(target_os = "windows"))]
    let cmd = {
        let mut c = CommandBuilder::new("sh");
        c.cwd(&cwd);
        c
    };

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn failed: {}", e))?;

    // Generate unique ID
    let id = format!("pty_{}", uuid_v4());

    // Take writer
    let writer: Box<dyn Write + Send> = pair
        .master
        .take_writer()
        .map_err(|e| format!("take_writer failed: {}", e))?;
    let writer = Arc::new(Mutex::new(writer));

    // Clone reader for background thread
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("try_clone_reader failed: {}", e))?;

    // Spawn background reader thread
    let id_clone = id.clone();
    let app_clone = app.clone();
    let handle = thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let payload = serde_json::json!({ "id": id_clone, "data": data });
                    let _ = app_clone.emit("pty-output", payload);
                }
                Err(_) => break,
            }
        }
    });

    // Store in registry (child is already Box<dyn Child + Send + Sync>)
    let entry = PtyEntry {
        master: pair.master,
        writer,
        child,
        _thread: handle,
    };
    registry().lock().unwrap().insert(id.clone(), entry);

    Ok(id)
}

#[tauri::command]
pub fn write_pty(pty_id: String, data: String) -> Result<(), String> {
    let map = registry().lock().unwrap();
    let entry = map.get(&pty_id).ok_or("PTY not found")?;
    let mut writer = entry.writer.lock().unwrap();
    writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("write failed: {}", e))?;
    writer.flush().map_err(|e| format!("flush failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn resize_pty(pty_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let map = registry().lock().unwrap();
    let entry = map.get(&pty_id).ok_or("PTY not found")?;
    entry
        .master
        .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("resize failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn kill_pty(pty_id: String) -> Result<(), String> {
    let mut map = registry().lock().unwrap();
    if let Some(entry) = map.remove(&pty_id) {
        // Dropping child kills the process
        drop(entry.child);
        // Thread will terminate when reader hits EOF
        drop(entry._thread);
    }
    Ok(())
}

// Simple v4-like UUID generator (no extra deps)
fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{:016x}_{:04x}", ts, (ts >> 48) as u16)
}
