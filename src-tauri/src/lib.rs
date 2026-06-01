use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

mod chat;
mod git;
mod pty;

const CLAUDE_DIR: &str = r"D:\claude_data\.claude";
const SETTINGS_FILE: &str = r"D:\claude_data\.claude\settings.json";
const SESSIONS_DIR: &str = r"D:\claude_data\.claude\sessions";
const HISTORY_FILE: &str = r"D:\claude_data\.claude\history.jsonl";
const BACKUPS_DIR: &str = r"D:\claude_data\.claude\backups";
const FILE_HISTORY_DIR: &str = r"D:\claude_data\.claude\file-history";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionInfo {
    pub id: String,
    pub name: String,
    pub created: String,
    pub message_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub timestamp: Option<String>,
    pub role: Option<String>,
    pub content: Option<String>,
    #[serde(flatten)]
    pub extra: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub name: String,
    pub path: String,
    pub last_opened: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectInfo {
    pub name: String,
    pub path: String,
    pub has_git: bool,
    pub has_claude: bool,
    pub last_modified: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionDetail {
    pub id: String,
    pub name: String,
    pub created: String,
    pub model: String,
    pub message_count: usize,
    pub history_preview: Vec<HistoryEntry>,
}

#[tauri::command]
fn read_config() -> Result<serde_json::Value, String> {
    let content = fs::read_to_string(SETTINGS_FILE)
        .map_err(|e| format!("cannot read config: {}", e))?;
    let json: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("json parse error: {}", e))?;
    Ok(json)
}

#[tauri::command]
fn read_config_raw() -> Result<String, String> {
    fs::read_to_string(SETTINGS_FILE)
        .map_err(|e| format!("cannot read config: {}", e))
}

#[tauri::command]
fn backup_config() -> Result<String, String> {
    let src = std::path::Path::new(SETTINGS_FILE);
    if !src.exists() {
        return Err("settings.json 不存在，无需备份".into());
    }

    // 确保 backups 目录存在
    fs::create_dir_all(BACKUPS_DIR)
        .map_err(|e| format!("创建备份目录失败: {}", e))?;

    // 生成带时间戳的备份文件名
    let now = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_name = format!("settings.{}.json", now);
    let backup_path = std::path::Path::new(BACKUPS_DIR).join(&backup_name);

    fs::copy(src, &backup_path)
        .map_err(|e| format!("备份失败: {}", e))?;

    Ok(format!("已备份到 backups/{}", backup_name))
}

#[tauri::command]
fn update_config(content: String) -> Result<String, String> {
    // 先备份
    if std::path::Path::new(SETTINGS_FILE).exists() {
        fs::create_dir_all(BACKUPS_DIR)
            .map_err(|e| format!("创建备份目录失败: {}", e))?;
        let now = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
        let backup_path = std::path::Path::new(BACKUPS_DIR)
            .join(format!("settings.{}.json", now));
        fs::copy(SETTINGS_FILE, &backup_path)
            .map_err(|e| format!("备份失败: {}", e))?;
    }

    // 确保目录存在
    if let Some(parent) = std::path::Path::new(SETTINGS_FILE).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    // 验证 JSON
    let _: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON 格式错误: {}", e))?;

    // 写入
    fs::write(SETTINGS_FILE, &content)
        .map_err(|e| format!("写入失败: {}", e))?;

    Ok("配置已保存".into())
}

#[tauri::command]
fn write_config(content: String) -> Result<String, String> {
    update_config(content)
}

#[tauri::command]
fn list_sessions() -> Result<Vec<SessionInfo>, String> {
    let sessions_path = PathBuf::from(SESSIONS_DIR);
    let mut sessions = Vec::new();
    if !sessions_path.exists() {
        return Ok(sessions);
    }
    let entries = fs::read_dir(&sessions_path)
        .map_err(|e| format!("read sessions dir failed: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("read entry failed: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let mut message_count = 0usize;
            if let Ok(messages) = fs::read_dir(&path) {
                message_count = messages.filter_map(|m| m.ok()).count();
            }
            let created = if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified) = metadata.modified() {
                    chrono::DateTime::<chrono::Local>::from(modified)
                        .format("%Y-%m-%d %H:%M:%S").to_string()
                } else { String::from("unknown") }
            } else { String::from("unknown") };
            sessions.push(SessionInfo { id: name.clone(), name, created, message_count });
        }
    }
    sessions.sort_by(|a, b| b.created.cmp(&a.created));
    Ok(sessions)
}

#[tauri::command]
fn list_history() -> Result<Vec<HistoryEntry>, String> {
    let history_path = PathBuf::from(HISTORY_FILE);
    let mut entries = Vec::new();
    if !history_path.exists() { return Ok(entries); }
    let content = fs::read_to_string(&history_path)
        .map_err(|e| format!("read history failed: {}", e))?;
    let all_lines: Vec<&str> = content.lines().collect();
    let start = if all_lines.len() > 50 { all_lines.len() - 50 } else { 0 };
    for line in &all_lines[start..] {
        if line.trim().is_empty() { continue; }
        match serde_json::from_str::<HistoryEntry>(line) {
            Ok(entry) => entries.push(entry),
            Err(_) => entries.push(HistoryEntry {
                timestamp: None, role: None,
                content: Some(line.to_string()),
                extra: serde_json::Value::Null,
            }),
        }
    }
    Ok(entries)
}

#[tauri::command]
fn list_projects() -> Result<Vec<Project>, String> {
    let projects_file = PathBuf::from(CLAUDE_DIR).join("projects.json");
    let mut projects = Vec::new();
    if projects_file.exists() {
        let content = fs::read_to_string(&projects_file)
            .map_err(|e| format!("read projects failed: {}", e))?;
        projects = serde_json::from_str(&content).unwrap_or_default();
    }
    Ok(projects)
}

#[tauri::command]
fn scan_projects(workspace: String) -> Result<Vec<ProjectInfo>, String> {
    let root = PathBuf::from(&workspace);
    if !root.exists() || !root.is_dir() {
        return Err(format!("目录不存在: {}", workspace));
    }

    let mut projects = Vec::new();
    scan_dir(&root, &mut projects, 0, 4)?;

    // 按修改时间倒序
    projects.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(projects)
}

fn scan_dir(
    dir: &PathBuf,
    projects: &mut Vec<ProjectInfo>,
    depth: usize,
    max_depth: usize,
) -> Result<(), String> {
    if depth > max_depth {
        return Ok(());
    }

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|_| "读取条目失败".to_string())?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        // 跳过隐藏目录
        let name = path.file_name().unwrap_or_default().to_string_lossy();
        if name.starts_with('.') && name != ".git" && name != ".claude" {
            continue;
        }

        let has_git = path.join(".git").exists();
        let has_claude = path.join(".claude").exists();

        if has_git || has_claude {
            let modified = fs::metadata(&path)
                .ok()
                .and_then(|m| m.modified().ok())
                .map(|t| {
                    chrono::DateTime::<chrono::Local>::from(t)
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string()
                })
                .unwrap_or_else(|| "未知".into());

            projects.push(ProjectInfo {
                name: name.to_string(),
                path: path.to_string_lossy().to_string(),
                has_git,
                has_claude,
                last_modified: modified,
            });
        }

        // 继续递归（但跳过 node_modules, target 等）
        if name != "node_modules" && name != "target" && name != ".git" {
            scan_dir(&path, projects, depth + 1, max_depth)?;
        }
    }

    Ok(())
}

#[tauri::command]
fn get_session_detail(session_id: String) -> Result<SessionDetail, String> {
    let session_dir = PathBuf::from(SESSIONS_DIR).join(&session_id);

    if !session_dir.exists() || !session_dir.is_dir() {
        return Err(format!("会话不存在: {}", session_id));
    }

    let name = session_id.clone();

    let created = fs::metadata(&session_dir)
        .ok()
        .and_then(|m| m.modified().ok())
        .map(|t| {
            chrono::DateTime::<chrono::Local>::from(t)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string()
        })
        .unwrap_or_else(|| "未知".into());

    // 估算消息数（子目录中的文件数）
    let mut message_count = 0usize;
    if let Ok(entries) = fs::read_dir(&session_dir) {
        for entry in entries.flatten() {
            if entry.path().is_file() {
                message_count += 1;
            }
        }
    }

    // 尝试加载该会话的 history.jsonl
    let history_path = session_dir.join("history.jsonl");
    let mut history_preview = Vec::new();
    let mut model = String::from("未知");

    if history_path.exists() {
        if let Ok(content) = fs::read_to_string(&history_path) {
            let all_lines: Vec<&str> = content.lines().collect();
            let start = if all_lines.len() > 20 {
                all_lines.len() - 20
            } else {
                0
            };

            for line in &all_lines[start..] {
                if line.trim().is_empty() {
                    continue;
                }
                if let Ok(entry) = serde_json::from_str::<HistoryEntry>(line) {
                    // 尝试从 extra 中提取模型名
                    if model == "未知" {
                        if let Some(m) = entry.extra.get("model") {
                            if let Some(m_str) = m.as_str() {
                                model = m_str.to_string();
                            }
                        }
                    }
                    history_preview.push(entry);
                }
            }
        }
    }

    Ok(SessionDetail {
        id: session_id,
        name,
        created,
        model,
        message_count,
        history_preview,
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileVersion {
    pub file_name: String,
    pub full_path: String,
    pub version_time: String,
    pub size_bytes: u64,
}

#[tauri::command]
fn get_git_diff(project_path: String) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(["diff", "--stat", "-p"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("执行 git 失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("not a git repository") {
            return Err("该项目不是 Git 仓库".into());
        }
        return Err(format!("git diff 出错: {}", stderr));
    }

    let diff = String::from_utf8_lossy(&output.stdout).to_string();
    if diff.trim().is_empty() {
        Ok("（无变更）".into())
    } else {
        Ok(diff)
    }
}

#[tauri::command]
fn get_file_history() -> Result<Vec<FileVersion>, String> {
    let root = PathBuf::from(FILE_HISTORY_DIR);
    let mut versions = Vec::new();

    if !root.exists() {
        return Ok(versions);
    }

    let entries = fs::read_dir(&root)
        .map_err(|e| format!("读取文件历史目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|_| "读取条目失败".to_string())?;
        let path = entry.path();

        let modified = fs::metadata(&path)
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|t| {
                chrono::DateTime::<chrono::Local>::from(t)
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string()
            })
            .unwrap_or_else(|| "未知".into());

        let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);

        versions.push(FileVersion {
            file_name: path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            full_path: path.to_string_lossy().to_string(),
            version_time: modified,
            size_bytes: size,
        });
    }

    versions.sort_by(|a, b| b.version_time.cmp(&a.version_time));
    Ok(versions)
}

#[tauri::command]
fn get_file_version_content(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn launch_claude(path: String) -> Result<String, String> {
    let project_path = PathBuf::from(&path);
    if !project_path.exists() { return Err(format!("path not exists: {}", path)); }
    if !project_path.is_dir() { return Err(format!("not a directory: {}", path)); }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", &format!("cd /d {} && claude", path)])
            .spawn()
            .map_err(|e| format!("launch claude failed: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("sh")
            .args(["-c", &format!("cd {} && claude", path)])
            .spawn()
            .map_err(|e| format!("launch claude failed: {}", e))?;
    }
    Ok(format!("claude started in {}", path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_config, read_config_raw,
            backup_config, update_config, write_config,
            list_sessions, list_history,
            list_projects, scan_projects, get_session_detail, launch_claude,
            pty::spawn_pty, pty::write_pty, pty::resize_pty, pty::kill_pty,
            get_git_diff, get_file_history, get_file_version_content,
            git::get_structured_diff, git::git_stage_file, git::git_unstage_file,
            git::git_stage_all, git::git_unstage_all, git::git_commit, git::git_file_history,
            git::open_file,
            chat::send_message, chat::stop_stream,
            chat::create_task, chat::delete_task, chat::rename_task,
            chat::save_session_messages, chat::load_session_messages,
            chat::get_chat_config,
        ])
        .setup(|app| {
            let data_dir = PathBuf::from(CLAUDE_DIR);
            let sessions_dir = PathBuf::from(SESSIONS_DIR);
            let backups_dir = PathBuf::from(BACKUPS_DIR);
            if !data_dir.exists() { let _ = fs::create_dir_all(&data_dir); }
            if !sessions_dir.exists() { let _ = fs::create_dir_all(&sessions_dir); }
            if !backups_dir.exists() { let _ = fs::create_dir_all(&backups_dir); }
            let settings_path = PathBuf::from(SETTINGS_FILE);
            if !settings_path.exists() {
                let default_config = serde_json::json!({
                    "model": "claude-sonnet-4-20250514",
                    "theme": "dark",
                    "language": "zh-CN",
                    "auto_save": true
                });
                let _ = fs::write(&settings_path, serde_json::to_string_pretty(&default_config).unwrap());
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Claude Code Desktop");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start app");
}
