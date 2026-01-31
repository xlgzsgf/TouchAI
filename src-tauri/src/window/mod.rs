// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 窗口管理模块
//!
//! 负责处理窗口相关的操作，包括显示、隐藏、焦点设置等

use tauri::{AppHandle, Manager};

/**
 * 动态调整窗口大小
 */
#[tauri::command]
pub async fn resize_search_window(app: AppHandle, height: u32) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    // 使用 LogicalSize 而不是 PhysicalSize，以正确处理 DPI 缩放
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 750.0, // 固定
            height: height as f64,
        }))
        .map_err(|e| e.to_string())?;

    // 重新居中窗口
    window.center().map_err(|e| e.to_string())?;

    Ok(())
}
/// 切换主窗口的可见性
pub fn toggle_window_visibility(app_handle: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_visible()? {
            window.hide()?;
        } else {
            window.show()?;
            window.set_focus()?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn hide_search_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    window.hide().map_err(|e| e.to_string())?;

    Ok(())
}