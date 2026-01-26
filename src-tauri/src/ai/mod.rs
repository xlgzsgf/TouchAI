// Copyright (c) 2025. 千诚. Licensed under GPL v3

use tauri::{AppHandle, Manager};

/**
 * 调整窗口大小以显示 AI 响应
 */
#[tauri::command]
pub async fn resize_window_for_response(app: AppHandle, height: u32) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    // 使用 LogicalSize 而不是 PhysicalSize，以正确处理 DPI 缩放
    // 固定宽度为 650，只改变高度
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 650.0,
            height: height as f64,
        }))
        .map_err(|e| e.to_string())?;

    // 重新居中窗口
    window.center().map_err(|e| e.to_string())?;

    Ok(())
}

/**
 * 获取当前窗口大小
 */
#[tauri::command]
pub async fn get_window_size(app: AppHandle) -> Result<(u32, u32), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    let size = window.outer_size().map_err(|e| e.to_string())?;

    Ok((size.width, size.height))
}
