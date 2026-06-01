use futures_util::StreamExt;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

const SETTINGS_FILE: &str = r"D:\claude_data\.claude\settings.json";
const SESSIONS_DIR: &str = r"D:\claude_data\.claude\sessions";

// Global cancel flags for active chat streams
static CANCEL_FLAGS: Lazy<Mutex<HashMap<String, Arc<AtomicBool>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskMetadata {
    pub id: String,
    pub name: String,
    pub created: String,
    pub model: String,
    pub message_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedMessage {
    pub role: String,
    pub content: String,
    pub timestamp: u64,
}

async fn call_anthropic_stream(
    app: AppHandle,
    task_id: &str,
    model: &str,
    messages: &[serde_json::Value],
    api_key: &str,
    base_url: &str,
    cancel_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let base = base_url.trim_end_matches('/');
    let url = format!("{}/messages", base);

    let body = serde_json::json!({
        "model": model,
        "max_tokens": 8192,
        "stream": true,
        "messages": messages,
    });

    let resp = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP 请求失败: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        return Err(format!("API 错误 {}: {}", status, body_text));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();
    let mut full_content = String::new();

    while let Some(chunk_result) = stream.next().await {
        // Check cancel flag
        if cancel_flag.load(Ordering::Relaxed) {
            // Emit whatever we have so far
            if !full_content.is_empty() {
                let done_payload = serde_json::json!({
                    "taskId": task_id,
                    "content": full_content,
                    "type": "done"
                });
                let _ = app.emit("chat-chunk", done_payload);
            }
            return Ok(());
        }

        let chunk = chunk_result.map_err(|e| format!("流读取错误: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        buffer.push_str(&text);

        // Process complete SSE lines
        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim_end_matches('\r').to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ") {
                if data == "[DONE]" {
                    continue;
                }

                let event: serde_json::Value = match serde_json::from_str(data) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                let event_type = event["type"].as_str().unwrap_or("");

                match event_type {
                    "content_block_delta" => {
                        if let Some(text) = event["delta"]["text"].as_str() {
                            full_content.push_str(text);
                            let payload = serde_json::json!({
                                "taskId": task_id,
                                "delta": text,
                                "type": "delta"
                            });
                            let _ = app.emit("chat-chunk", payload);
                        }
                    }
                    "message_stop" => {
                        let payload = serde_json::json!({
                            "taskId": task_id,
                            "content": full_content,
                            "type": "done"
                        });
                        let _ = app.emit("chat-chunk", payload);
                        return Ok(());
                    }
                    "message_delta" => {
                        // Some proxies send message_delta with stop reason
                        if event["delta"]["stop_reason"].as_str().is_some() {
                            let payload = serde_json::json!({
                                "taskId": task_id,
                                "content": full_content,
                                "type": "done"
                            });
                            let _ = app.emit("chat-chunk", payload);
                            return Ok(());
                        }
                    }
                    "error" => {
                        let err_msg = event["error"]["message"]
                            .as_str()
                            .unwrap_or("未知错误")
                            .to_string();
                        let payload = serde_json::json!({
                            "taskId": task_id,
                            "error": err_msg,
                            "type": "error"
                        });
                        let _ = app.emit("chat-chunk", payload);
                        return Err(err_msg);
                    }
                    _ => {}
                }
            }
        }
    }

    // Stream ended without explicit message_stop — treat as done
    if !full_content.is_empty() {
        let payload = serde_json::json!({
            "taskId": task_id,
            "content": full_content,
            "type": "done"
        });
        let _ = app.emit("chat-chunk", payload);
    }
    Ok(())
}

fn read_chat_config() -> Result<(String, String, String), String> {
    let content =
        fs::read_to_string(SETTINGS_FILE).map_err(|e| format!("读取配置失败: {}", e))?;
    let cfg: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("JSON 解析错误: {}", e))?;

    let env = cfg
        .get("env")
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    let api_key = env
        .get("ANTHROPIC_API_KEY")
        .or_else(|| env.get("ANTHROPIC_AUTH_TOKEN"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if api_key.is_empty() {
        return Err("未配置 API Key，请在设置中添加 env.ANTHROPIC_API_KEY".into());
    }

    let base_url = env
        .get("ANTHROPIC_BASE_URL")
        .and_then(|v| v.as_str())
        .unwrap_or("https://api.anthropic.com")
        .to_string();

    let default_model = env
        .get("ANTHROPIC_MODEL")
        .and_then(|v| v.as_str())
        .unwrap_or("claude-sonnet-4-20250514")
        .to_string();

    Ok((api_key, base_url, default_model))
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    task_id: String,
    model: Option<String>,
    messages: Vec<serde_json::Value>,
) -> Result<(), String> {
    let (api_key, base_url, default_model) = read_chat_config()?;
    let model = model.unwrap_or(default_model);

    // Register cancel flag
    let cancel = Arc::new(AtomicBool::new(false));
    CANCEL_FLAGS
        .lock()
        .map_err(|e| format!("锁错误: {}", e))?
        .insert(task_id.clone(), cancel.clone());

    let app_clone = app.clone();
    let tid = task_id.clone();

    // Spawn background task for streaming
    tokio::spawn(async move {
        let result = call_anthropic_stream(
            app_clone.clone(),
            &tid,
            &model,
            &messages,
            &api_key,
            &base_url,
            cancel,
        )
        .await;

        if let Err(e) = result {
            let payload = serde_json::json!({
                "taskId": tid,
                "error": e,
                "type": "error"
            });
            let _ = app_clone.emit("chat-chunk", payload);
        }

        // Clean up cancel flag
        if let Ok(mut flags) = CANCEL_FLAGS.lock() {
            flags.remove(&tid);
        }
    });

    Ok(())
}

#[tauri::command]
pub fn stop_stream(task_id: String) -> Result<(), String> {
    let flags = CANCEL_FLAGS
        .lock()
        .map_err(|e| format!("锁错误: {}", e))?;
    if let Some(flag) = flags.get(&task_id) {
        flag.store(true, Ordering::Relaxed);
    }
    Ok(())
}

// ── Task / Session Management Commands ──

#[tauri::command]
pub fn create_task(name: String) -> Result<TaskMetadata, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let task_dir = std::path::Path::new(SESSIONS_DIR).join(&id);

    fs::create_dir_all(&task_dir).map_err(|e| format!("创建任务目录失败: {}", e))?;

    let now = chrono::Local::now()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    let model = read_chat_config()
        .map(|(_, _, m)| m)
        .unwrap_or_else(|_| "claude-sonnet-4-20250514".into());

    let metadata = TaskMetadata {
        id: id.clone(),
        name: name.clone(),
        created: now,
        model,
        message_count: 0,
    };

    // Write metadata
    let meta_path = task_dir.join("metadata.json");
    let meta_json =
        serde_json::to_string_pretty(&metadata).map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&meta_path, meta_json).map_err(|e| format!("写入元数据失败: {}", e))?;

    // Create empty history.jsonl
    let history_path = task_dir.join("history.jsonl");
    fs::write(&history_path, "").map_err(|e| format!("创建历史文件失败: {}", e))?;

    Ok(metadata)
}

#[tauri::command]
pub fn delete_task(task_id: String) -> Result<(), String> {
    let task_dir = std::path::Path::new(SESSIONS_DIR).join(&task_id);
    if task_dir.exists() {
        fs::remove_dir_all(&task_dir)
            .map_err(|e| format!("删除任务失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn rename_task(task_id: String, name: String) -> Result<(), String> {
    let meta_path = std::path::Path::new(SESSIONS_DIR)
        .join(&task_id)
        .join("metadata.json");

    let content =
        fs::read_to_string(&meta_path).map_err(|e| format!("读取元数据失败: {}", e))?;
    let mut meta: TaskMetadata =
        serde_json::from_str(&content).map_err(|e| format!("解析元数据失败: {}", e))?;
    meta.name = name;

    let meta_json =
        serde_json::to_string_pretty(&meta).map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&meta_path, meta_json).map_err(|e| format!("写入元数据失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn save_session_messages(task_id: String, messages_json: String) -> Result<(), String> {
    let history_path = std::path::Path::new(SESSIONS_DIR)
        .join(&task_id)
        .join("history.jsonl");

    let messages: Vec<SavedMessage> =
        serde_json::from_str(&messages_json).map_err(|e| format!("解析消息失败: {}", e))?;

    let mut lines = String::new();
    for msg in &messages {
        let line = serde_json::to_string(msg).map_err(|e| format!("序列化失败: {}", e))?;
        lines.push_str(&line);
        lines.push('\n');
    }

    fs::write(&history_path, &lines).map_err(|e| format!("保存消息失败: {}", e))?;

    // Update message count in metadata
    let meta_path = std::path::Path::new(SESSIONS_DIR)
        .join(&task_id)
        .join("metadata.json");
    if let Ok(content) = fs::read_to_string(&meta_path) {
        if let Ok(mut meta) = serde_json::from_str::<TaskMetadata>(&content) {
            meta.message_count = messages.len();
            if let Ok(json) = serde_json::to_string_pretty(&meta) {
                let _ = fs::write(&meta_path, json);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn load_session_messages(task_id: String) -> Result<Vec<SavedMessage>, String> {
    let history_path = std::path::Path::new(SESSIONS_DIR)
        .join(&task_id)
        .join("history.jsonl");

    if !history_path.exists() {
        return Ok(Vec::new());
    }

    let content =
        fs::read_to_string(&history_path).map_err(|e| format!("读取历史失败: {}", e))?;

    let mut messages = Vec::new();
    for line in content.lines() {
        if line.trim().is_empty() {
            continue;
        }
        if let Ok(msg) = serde_json::from_str::<SavedMessage>(line) {
            messages.push(msg);
        }
    }

    Ok(messages)
}

#[tauri::command]
pub fn get_chat_config() -> Result<serde_json::Value, String> {
    let (api_key, base_url, model) = read_chat_config()?;
    // Mask the key for display
    let masked_key = if api_key.len() > 8 {
        format!("{}...{}", &api_key[..4], &api_key[api_key.len() - 4..])
    } else {
        "***".into()
    };
    Ok(serde_json::json!({
        "baseUrl": base_url,
        "model": model,
        "apiKeyMasked": masked_key,
        "hasApiKey": !api_key.is_empty(),
    }))
}
