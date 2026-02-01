// Copyright (c) 2025. 千诚. Licensed under GPL v3

//! 系统托盘模块
//!
//! 负责创建和管理系统托盘图标及其菜单

use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder,
};

/// 创建系统托盘
pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 加载托盘图标
    let icon = load_tray_icon()?;

    // 创建托盘图标
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .tooltip("TouchAI")
        .on_tray_icon_event(|tray, event| {
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Right,
                    button_state: MouseButtonState::Up,
                    position,
                    ..
                } => {
                    // 右键点击时显示自定义菜单窗口
                    let app = tray.app_handle();
                    if let Err(e) = show_tray_menu(app, position) {
                        eprintln!("Failed to show tray menu: {}", e);
                    }
                }
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    // 左键点击时显示主窗口
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

/// 加载托盘图标
fn load_tray_icon() -> Result<Image<'static>, Box<dyn std::error::Error>> {
    // 使用应用图标作为托盘图标
    let icon_bytes = include_bytes!("../../icons/32x32.png");

    // 解码 PNG 图片
    let image = image::load_from_memory(icon_bytes)?;
    let rgba = image.to_rgba8();
    let (width, height) = rgba.dimensions();

    let icon = Image::new_owned(rgba.into_raw(), width, height);
    Ok(icon)
}

/// 显示托盘菜单窗口
fn show_tray_menu(
    app: &AppHandle,
    click_position: PhysicalPosition<f64>,
) -> Result<(), Box<dyn std::error::Error>> {
    // 菜单尺寸（逻辑像素）
    let menu_width = 140.0; // 从 180 调整为 140
    let menu_height = 134.0; // 3个菜单项，每项约44px高度，加上边框

    // 检查托盘菜单窗口是否已存在
    if let Some(window) = app.get_webview_window("tray-menu") {
        // 获取缩放因子
        let scale_factor = window.scale_factor().unwrap_or(1.0);

        // 将物理像素转换为逻辑像素
        let logical_x = click_position.x / scale_factor;
        let logical_y = click_position.y / scale_factor;

        // 更新窗口位置：在鼠标点击位置的左上角（使用逻辑像素）
        let x = (logical_x - menu_width).max(10.0);
        let y = (logical_y - menu_height).max(10.0);

        window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))?;

        // 显示并聚焦
        window.show()?;
        window.set_focus()?;
        return Ok(());
    }

    // 创建托盘菜单窗口，使用主应用的路由
    let window = WebviewWindowBuilder::new(
        app,
        "tray-menu",
        WebviewUrl::App("/tray-menu".parse().unwrap()),
    )
    .inner_size(menu_width, menu_height)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .focused(true)
    .build()?;

    // 获取缩放因子
    let scale_factor = window.scale_factor().unwrap_or(1.0);

    // 将物理像素转换为逻辑像素
    let logical_x = click_position.x / scale_factor;
    let logical_y = click_position.y / scale_factor;

    // 计算菜单位置：在鼠标点击位置的左上角（使用逻辑像素）
    // 获取屏幕尺寸以确保菜单不会超出屏幕
    let (x, y) = if let Ok(Some(monitor)) = window.current_monitor() {
        let screen_size = monitor.size();
        let logical_screen_width = screen_size.width as f64 / scale_factor;
        let logical_screen_height = screen_size.height as f64 / scale_factor;

        let mut x = (logical_x - menu_width).max(10.0);
        let mut y = (logical_y - menu_height).max(10.0);

        // 确保菜单不会超出屏幕左边界
        if x < 10.0 {
            x = 10.0;
        }

        // 确保菜单不会超出屏幕上边界
        if y < 10.0 {
            y = 10.0;
        }

        // 确保菜单不会超出屏幕右边界
        if x + menu_width > logical_screen_width - 10.0 {
            x = logical_screen_width - menu_width - 10.0;
        }

        // 确保菜单不会超出屏幕下边界
        if y + menu_height > logical_screen_height - 10.0 {
            y = logical_screen_height - menu_height - 10.0;
        }

        (x, y)
    } else {
        // 如果无法获取屏幕信息，使用默认位置
        let x = (logical_x - menu_width).max(10.0);
        let y = (logical_y - menu_height).max(10.0);
        (x, y)
    };

    window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))?;

    // 显示窗口
    window.show()?;
    window.set_focus()?;

    Ok(())
}

/// 关闭托盘菜单窗口
#[tauri::command]
pub fn close_tray_menu(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("tray-menu") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 退出应用
#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}
