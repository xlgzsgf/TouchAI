// Copyright (c) 2025. 千诚. Licensed under GPL v3

mod autostart;
mod settings;
mod shortcut;
mod tray;
mod utils;
mod window;

use utils::path::ensure_data_directory;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 确保数据目录存在
    if let Err(e) = ensure_data_directory() {
        eprintln!("Failed to create data directory: {}", e);
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            window::resize_search_window,
            window::hide_search_window,
            settings::open_settings_window,
            shortcut::register_global_shortcut,
            autostart::enable_autostart,
            autostart::disable_autostart,
            autostart::is_autostart_enabled,
            tray::close_tray_menu,
            tray::exit_app,
        ])
        .setup(|app| {
            // 创建系统托盘
            if let Err(e) = tray::create_tray(app.handle()) {
                eprintln!("Failed to create tray: {}", e);
            }

            // 设置快捷键处理
            let shortcut_handler = shortcut::create_shortcut_handler();
            app.handle()
                .plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(shortcut_handler)
                        .build(),
                )
                .map_err(|e| {
                    eprintln!("Failed to setup global shortcut plugin: {}", e);
                    e
                })?;

            // 注册快捷键
            if let Err(e) = shortcut::register_shortcuts(app.handle()) {
                eprintln!("Failed to register shortcuts: {}", e);
                return Err(e);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .map_err(|e| {
            eprintln!("Error while running tauri application: {}", e);
            e
        })
        .expect("error while running tauri application");
}
