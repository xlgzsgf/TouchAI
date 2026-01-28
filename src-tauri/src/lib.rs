// Copyright (c) 2025. 千诚. Licensed under GPL v3

mod ai;
mod settings;
mod shortcut;
mod window;

use std::fs;
use std::path::PathBuf;

/// 确保数据目录存在
fn ensure_data_directory() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // 获取当前可执行文件所在目录
    let exe_dir = std::env::current_exe()?
        .parent()
        .ok_or("Failed to get executable directory")?
        .to_path_buf();

    // 在开发环境中，可执行文件在 target/debug 或 target/release
    // 在生产环境中，可执行文件在应用根目录
    let data_dir = if exe_dir.ends_with("debug") || exe_dir.ends_with("release") {
        // 开发环境：回到项目根目录

        exe_dir.parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .ok_or("Failed to get project root")?
            .join("data")
    } else {
        // 生产环境：在可执行文件同级目录
        exe_dir.join("data")
    };

    // 创建目录（如果不存在）
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)?;
        println!("Created data directory at: {}", data_dir.display());
    }

    Ok(data_dir)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 确保数据目录存在
    if let Err(e) = ensure_data_directory() {
        eprintln!("Failed to create data directory: {}", e);
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ai::resize_window_for_response,
            ai::get_window_size,
            settings::open_settings_window,
        ])
        .setup(|app| {
            // 设置窗口事件
            if let Err(e) = window::setup_window_events(app) {
                eprintln!("Failed to setup window events: {}", e);
                return Err(e.into());
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
