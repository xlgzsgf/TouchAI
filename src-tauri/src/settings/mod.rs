// Copyright (c) 2025. 千诚. Licensed under GPL v3

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/**
 * 打开设置窗口
 */
#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    // 检查设置窗口是否已存在
    if let Some(settings_window) = app.get_webview_window("settings") {
        // 如果已存在，先取消最小化，然后显示并聚焦
        settings_window.unminimize().map_err(|e| e.to_string())?;
        settings_window.show().map_err(|e| e.to_string())?;
        settings_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // 创建新的设置窗口
    WebviewWindowBuilder::new(
        &app,
        "settings",
        WebviewUrl::App("/settings".parse().unwrap()),
    )
    .title("TouchAI - 设置")
    .inner_size(800.0, 600.0)
    .min_inner_size(800.0, 600.0)
    .resizable(true)
    .decorations(false)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
