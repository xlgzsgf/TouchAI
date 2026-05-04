// Copyright (c) 2026. 千诚. Licensed under GPL v3.

//! 主窗口管理逻辑。

use tauri::{AppHandle, Manager};

#[cfg(target_os = "windows")]
use raw_window_handle::HasWindowHandle;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Dwm::{
    DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_WINDOW_CORNER_PREFERENCE,
};

/// 隐藏主搜索窗口。
pub fn hide_search_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShortcutToggleAction {
    ShowWithAutoPasteAuthorization,
    HideOnly,
}

/// 根据窗口可见性决定快捷键切换动作。
pub fn resolve_shortcut_toggle_action(is_visible: bool) -> ShortcutToggleAction {
    if is_visible {
        ShortcutToggleAction::HideOnly
    } else {
        ShortcutToggleAction::ShowWithAutoPasteAuthorization
    }
}

/// 处理全局快捷键触发的搜索窗口显隐切换。
pub fn show_search_window_from_shortcut(app_handle: &AppHandle) -> Result<(), String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;
    let action = resolve_shortcut_toggle_action(window.is_visible().map_err(|e| e.to_string())?);

    // 只有 hidden -> shown 才授权 auto-paste；窗口已显示时快捷键只负责隐藏。
    match action {
        ShortcutToggleAction::ShowWithAutoPasteAuthorization => {
            if let Some(runtime) =
                app_handle.try_state::<crate::core::system::clipboard::ClipboardRuntime>()
            {
                runtime.authorize_shortcut_auto_paste();
            }
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
        ShortcutToggleAction::HideOnly => {
            window.hide().map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
const DWMWCP_ROUND: u32 = 2;
#[cfg(target_os = "windows")]
const DWMWA_COLOR_NONE: u32 = 0xFFFFFFFE;

#[cfg(target_os = "windows")]
/// 设置 Windows 搜索窗口圆角和边框样式。
pub fn set_search_window_style(window: &tauri::WebviewWindow) -> Result<(), String> {
    let window_handle = window
        .window_handle()
        .map_err(|e| format!("Failed to get window handle: {}", e))?;

    let hwnd = match window_handle.as_ref() {
        raw_window_handle::RawWindowHandle::Win32(handle) => {
            windows::Win32::Foundation::HWND(handle.hwnd.get() as _)
        }
        _ => return Err("Not a Win32 window".to_string()),
    };

    unsafe {
        // 圆角
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &DWMWCP_ROUND as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| format!("Failed to set rounded corners: {}", e))?;

        // 边框
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR,
            &DWMWA_COLOR_NONE as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| format!("Failed to remove border: {}", e))?;
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
/// 在非 Windows 平台跳过搜索窗口样式设置。
pub fn set_search_window_style(_window: &tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}
