// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 主窗口管理逻辑。

use tauri::{AppHandle, Manager};

#[cfg(target_os = "windows")]
use raw_window_handle::HasWindowHandle;
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Dwm::{
    DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_WINDOW_CORNER_PREFERENCE,
};

pub fn resize_search_window(app: AppHandle, height: u32, center: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    let new_height = height as f64;

    if center {
        let scale_factor = window.scale_factor().map_err(|e| e.to_string())?;
        let current_position = window.outer_position().map_err(|e| e.to_string())?;
        let current_size = window.inner_size().map_err(|e| e.to_string())?;

        let current_x = current_position.x as f64 / scale_factor;
        let current_y = current_position.y as f64 / scale_factor;
        let current_height = current_size.height as f64 / scale_factor;

        let new_y = current_y - (new_height - current_height) / 2.0;

        window
            .set_position(tauri::Position::Logical(tauri::LogicalPosition {
                x: current_x,
                y: new_y,
            }))
            .map_err(|e| e.to_string())?;
    }

    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 750.0,
            height: new_height,
        }))
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn hide_search_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn toggle_search_window_visibility(app_handle: &AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        if window.is_visible().map_err(|e| e.to_string())? {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
const DWMWCP_ROUND: u32 = 2;
#[cfg(target_os = "windows")]
const DWMWA_COLOR_NONE: u32 = 0xFFFFFFFE;

#[cfg(target_os = "windows")]
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
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE,
            &DWMWCP_ROUND as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        )
        .map_err(|e| format!("Failed to set rounded corners: {}", e))?;

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
pub fn set_search_window_style(_window: &tauri::WebviewWindow) -> Result<(), String> {
    Ok(())
}
