// Copyright (c) 2025. 千诚. Licensed under GPL v3

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/**
 * 打开设置窗口
 */
#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    // 检查设置窗口是否已存在
    if let Some(settings_window) = app.get_webview_window("settings") {
        // 如果已存在，显示并聚焦
        settings_window.show().map_err(|e| e.to_string())?;
        settings_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // 获取开发服务器 URL 或生产环境路径
    let url = if cfg!(dev) {
        // 开发环境：使用 Vite 开发服务器
        "http://localhost:1420/settings"
    } else {
        // 生产环境：使用打包后的文件
        "/settings"
    };

    // 创建新的设置窗口
    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App(url.into()))
        .title("TouchAI - 设置")
        .inner_size(800.0, 600.0)
        .min_inner_size(800.0, 600.0)
        .resizable(false)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_module_compilation() {
        assert!(true);
    }
}
