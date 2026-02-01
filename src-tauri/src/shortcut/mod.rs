// Copyright (c) 2025. 千诚. Licensed under GPL v3

//! 快捷键处理模块
//!
//! 负责注册和处理全局快捷键

use crate::window;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent};

/// 当前注册的快捷键（用于取消注册）
static mut CURRENT_SHORTCUT: Option<Shortcut> = None;

/// 解析快捷键字符串（如 "Ctrl+Space", "Alt+A"）
fn parse_shortcut(shortcut_str: &str) -> Result<Shortcut, String> {
    let parts: Vec<&str> = shortcut_str.split('+').map(|s| s.trim()).collect();

    if parts.is_empty() {
        return Err("Invalid shortcut format".to_string());
    }

    let mut modifiers = Modifiers::empty();
    let mut key_code: Option<Code> = None;

    for part in parts {
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= Modifiers::CONTROL,
            "alt" => modifiers |= Modifiers::ALT,
            "shift" => modifiers |= Modifiers::SHIFT,
            key => {
                // 解析按键
                key_code = Some(match key.to_lowercase().as_str() {
                    "space" => Code::Space,
                    "enter" | "return" => Code::Enter,
                    "tab" => Code::Tab,
                    "backspace" => Code::Backspace,
                    "escape" | "esc" => Code::Escape,
                    "delete" | "del" => Code::Delete,
                    "insert" => Code::Insert,
                    "home" => Code::Home,
                    "end" => Code::End,
                    "pageup" => Code::PageUp,
                    "pagedown" => Code::PageDown,
                    "arrowup" | "up" => Code::ArrowUp,
                    "arrowdown" | "down" => Code::ArrowDown,
                    "arrowleft" | "left" => Code::ArrowLeft,
                    "arrowright" | "right" => Code::ArrowRight,
                    // 字母键
                    "a" => Code::KeyA,
                    "b" => Code::KeyB,
                    "c" => Code::KeyC,
                    "d" => Code::KeyD,
                    "e" => Code::KeyE,
                    "f" => Code::KeyF,
                    "g" => Code::KeyG,
                    "h" => Code::KeyH,
                    "i" => Code::KeyI,
                    "j" => Code::KeyJ,
                    "k" => Code::KeyK,
                    "l" => Code::KeyL,
                    "m" => Code::KeyM,
                    "n" => Code::KeyN,
                    "o" => Code::KeyO,
                    "p" => Code::KeyP,
                    "q" => Code::KeyQ,
                    "r" => Code::KeyR,
                    "s" => Code::KeyS,
                    "t" => Code::KeyT,
                    "u" => Code::KeyU,
                    "v" => Code::KeyV,
                    "w" => Code::KeyW,
                    "x" => Code::KeyX,
                    "y" => Code::KeyY,
                    "z" => Code::KeyZ,
                    // 数字键
                    "0" => Code::Digit0,
                    "1" => Code::Digit1,
                    "2" => Code::Digit2,
                    "3" => Code::Digit3,
                    "4" => Code::Digit4,
                    "5" => Code::Digit5,
                    "6" => Code::Digit6,
                    "7" => Code::Digit7,
                    "8" => Code::Digit8,
                    "9" => Code::Digit9,
                    // F键
                    "f1" => Code::F1,
                    "f2" => Code::F2,
                    "f3" => Code::F3,
                    "f4" => Code::F4,
                    "f5" => Code::F5,
                    "f6" => Code::F6,
                    "f7" => Code::F7,
                    "f8" => Code::F8,
                    "f9" => Code::F9,
                    "f10" => Code::F10,
                    "f11" => Code::F11,
                    "f12" => Code::F12,
                    _ => return Err(format!("Unknown key: {}", key)),
                });
            }
        }
    }

    match key_code {
        Some(code) => Ok(Shortcut::new(
            if modifiers.is_empty() {
                None
            } else {
                Some(modifiers)
            },
            code,
        )),
        None => Err("No key code specified".to_string()),
    }
}

/// 注册全局快捷键（默认 Alt+Space）
pub fn register_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 默认注册 Alt+Space 快捷键
    let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    app.global_shortcut().register(alt_space)?;

    unsafe {
        CURRENT_SHORTCUT = Some(alt_space);
    }

    Ok(())
}

/// 注册自定义快捷键
#[tauri::command]
pub fn register_global_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    // 解析快捷键字符串
    let new_shortcut = parse_shortcut(&shortcut)?;

    // 取消注册旧的快捷键
    unsafe {
        if let Some(old_shortcut) = CURRENT_SHORTCUT {
            let _ = app.global_shortcut().unregister(old_shortcut);
        }
    }

    // 注册新的快捷键
    app.global_shortcut()
        .register(new_shortcut)
        .map_err(|e| format!("Failed to register shortcut: {}", e))?;

    // 保存当前快捷键
    unsafe {
        CURRENT_SHORTCUT = Some(new_shortcut);
    }

    Ok(())
}

/// 创建快捷键处理器
pub fn create_shortcut_handler() -> impl Fn(&AppHandle, &Shortcut, ShortcutEvent) {
    move |app_handle, _received_shortcut, event| {
        // 处理任何已注册的快捷键
        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            // 忽略切换窗口可见性的错误
            let _ = window::toggle_window_visibility(app_handle);
        }
    }
}
