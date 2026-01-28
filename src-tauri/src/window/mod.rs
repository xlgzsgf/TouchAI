// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 窗口管理模块
//!
//! 负责处理窗口相关的操作，包括显示、隐藏、焦点设置等

use tauri::{Manager, WindowEvent};

/// 设置窗口事件监听器
/// 当窗口失去焦点时自动隐藏窗口（保持当前大小）
pub fn setup_window_events(_app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let main_window = _app
                .get_webview_window("main")
                .ok_or("Failed to get main window")?;

    let search_window_clone = main_window.clone();

    main_window.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            // 只隐藏窗口，不重置大小
            let _ = search_window_clone.hide();
        }
    });
    Ok(())
}
