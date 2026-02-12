// Copyright (c) 2025. 千诚. Licensed under GPL v3.

//! 数据库相关命令

use crate::core::system::database;

#[tauri::command]
pub fn get_database_path() -> Result<String, String> {
    database::get_database_path()
}
