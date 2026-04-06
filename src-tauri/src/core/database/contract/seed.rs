// Copyright (c) 2026. 千诚. Licensed under GPL v3.

//! 数据库初始种子执行器。

use std::{fs, path::Path};

use sqlx::{Pool, Sqlite};

/// 执行数据库种子工件。
///
/// 种子内容统一维护在 `src/database/artifacts/runtime/seed.sql`，
/// Rust 只负责读取并执行，避免再维护一份内嵌初始化 SQL。
pub async fn apply_seed(pool: &Pool<Sqlite>, artifacts_dir: &Path) -> Result<(), String> {
    let seed_path = artifacts_dir.join("runtime").join("seed.sql");
    let seed_sql = fs::read_to_string(&seed_path).map_err(|error| {
        format!(
            "Failed to read database seed artifact '{}': {error}",
            seed_path.display()
        )
    })?;

    sqlx::raw_sql(&seed_sql)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to execute database seed artifact: {error}"))?;

    Ok(())
}
