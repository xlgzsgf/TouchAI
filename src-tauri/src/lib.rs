// Copyright (c) 2025. 千诚. Licensed under GPL v3

mod ai;
mod settings;
mod shortcut;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
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
