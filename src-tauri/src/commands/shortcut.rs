// Copyright (c) 2026. 千诚. Licensed under GPL v3.

//! 快捷键命令。
use tauri::AppHandle;

#[tauri::command]
pub fn register_global_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    crate::core::system::shortcut::register_global_shortcut(app, shortcut)
}
