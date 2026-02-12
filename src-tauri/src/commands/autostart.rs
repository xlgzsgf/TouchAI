// Copyright (c) 2026. 千诚. Licensed under GPL v3.

//! 自启动命令。
use tauri::AppHandle;

#[tauri::command]
pub fn enable_autostart(app: AppHandle) -> Result<(), String> {
    crate::core::system::autostart::enable_autostart(app)
}

#[tauri::command]
pub fn disable_autostart(app: AppHandle) -> Result<(), String> {
    crate::core::system::autostart::disable_autostart(app)
}

#[tauri::command]
pub fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    crate::core::system::autostart::is_autostart_enabled(app)
}
