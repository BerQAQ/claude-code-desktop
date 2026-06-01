use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileDiff {
    pub file: String,
    pub status: String,
    pub additions: u32,
    pub deletions: u32,
    pub before: String,
    pub after: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

// Helper: run a git command in the project directory, return stdout
fn git(project_path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("执行 git 失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git 命令失败: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// Helper: read a file from the working tree
fn read_working_tree(project_path: &str, file_path: &str) -> String {
    let full_path = std::path::Path::new(project_path).join(file_path);
    std::fs::read_to_string(&full_path).unwrap_or_default()
}

// Helper: count lines that start with + or - in a diff block (excluding +++/--- headers)
fn count_diff_lines(diff_text: &str) -> (u32, u32) {
    let additions = diff_text.lines().filter(|l| l.starts_with('+') && !l.starts_with("+++")).count() as u32;
    let deletions = diff_text.lines().filter(|l| l.starts_with('-') && !l.starts_with("---")).count() as u32;
    (additions, deletions)
}

#[tauri::command]
pub fn get_structured_diff(project_path: String) -> Result<Vec<FileDiff>, String> {
    // Get list of changed files
    let name_status = git(&project_path, &["diff", "--name-status"])?;

    if name_status.trim().is_empty() {
        return Ok(Vec::new());
    }

    let mut diffs = Vec::new();

    for line in name_status.lines() {
        let parts: Vec<&str> = line.splitn(2, '\t').collect();
        if parts.len() < 2 {
            continue;
        }
        let status_code = parts[0].trim();
        let file_path = parts[1].trim().to_string();

        let status = match status_code {
            "A" => "added",
            "D" => "deleted",
            "M" => "modified",
            _ => "modified",
        };

        // Get before content
        let before = if status == "added" {
            String::new()
        } else {
            // Try git show HEAD:<file> for original content
            git(&project_path, &["show", &format!("HEAD:{}", file_path)])
                .unwrap_or_default()
        };

        // Get after content
        let after = if status == "deleted" {
            String::new()
        } else {
            read_working_tree(&project_path, &file_path)
        };

        // Count additions/deletions from file-specific diff
        let file_diff_text = git(
            &project_path,
            &["diff", "--", &file_path],
        )
        .unwrap_or_default();
        let (additions, deletions) = count_diff_lines(&file_diff_text);

        diffs.push(FileDiff {
            file: file_path,
            status: status.to_string(),
            additions,
            deletions,
            before,
            after,
        });
    }

    Ok(diffs)
}

#[tauri::command]
pub fn git_stage_file(project_path: String, file_path: String) -> Result<(), String> {
    git(&project_path, &["add", "--", &file_path])?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage_file(project_path: String, file_path: String) -> Result<(), String> {
    git(&project_path, &["reset", "HEAD", "--", &file_path])?;
    Ok(())
}

#[tauri::command]
pub fn git_stage_all(project_path: String) -> Result<(), String> {
    git(&project_path, &["add", "-A"])?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage_all(project_path: String) -> Result<(), String> {
    git(&project_path, &["reset", "HEAD"])?;
    Ok(())
}

#[tauri::command]
pub fn git_commit(project_path: String, message: String) -> Result<String, String> {
    let hash = git(&project_path, &["commit", "-m", &message])?;
    Ok(hash.trim().to_string())
}

#[tauri::command]
pub fn git_file_history(
    project_path: String,
    file_path: String,
) -> Result<Vec<CommitInfo>, String> {
    let output = git(
        &project_path,
        &[
            "log",
            "--oneline",
            "-20",
            "--format=%H|%s|%an|%ad",
            "--date=short",
            "--",
            &file_path,
        ],
    )?;

    let mut commits = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(4, '|').collect();
        if parts.len() >= 4 {
            commits.push(CommitInfo {
                hash: parts[0].to_string(),
                message: parts[1].to_string(),
                author: parts[2].to_string(),
                date: parts[3].to_string(),
            });
        }
    }
    Ok(commits)
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("无法打开文件: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开文件: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开文件: {}", e))?;
    }
    Ok(())
}
