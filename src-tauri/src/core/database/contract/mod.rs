// Copyright (c) 2026. 千诚. Licensed under GPL v3.

//! 数据库契约与 SQL 工件执行。

mod seed;

use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    str::FromStr,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
    Pool, Row, Sqlite, SqlitePool,
};
use tauri::Manager;

pub(crate) use seed::apply_seed;

/// 创建应用共享的 SQLite 连接池。
pub(crate) async fn create_sqlite_pool(path: &Path) -> Result<SqlitePool, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create database directory: {error}"))?;
    }

    let options = SqliteConnectOptions::from_str(&format!("sqlite://{}", path.display()))
        .map_err(|error| format!("Failed to create sqlite connect options: {error}"))?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_secs(5));

    SqlitePoolOptions::new()
        .max_connections(8)
        .min_connections(1)
        .connect_with(options)
        .await
        .map_err(|error| format!("Failed to connect sqlite pool: {error}"))
}

/// 执行 Drizzle 迁移工件。
pub(crate) async fn migrate_database(
    pool: &Pool<Sqlite>,
    migration_dir: &Path,
) -> Result<(), String> {
    ensure_migrations_table(pool).await?;

    let journal_path = migration_dir.join("meta").join("_journal.json");
    let journal = fs::read_to_string(&journal_path).map_err(|error| {
        format!(
            "Failed to read migration journal '{}': {error}",
            journal_path.display()
        )
    })?;
    let journal_json: serde_json::Value = serde_json::from_str(&journal)
        .map_err(|error| format!("Invalid migration journal: {error}"))?;
    let entries = journal_json
        .get("entries")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "Migration journal entries are missing".to_string())?;

    let applied_rows = sqlx::query("SELECT hash FROM migrations")
        .fetch_all(pool)
        .await
        .map_err(|error| format!("Failed to load applied migrations: {error}"))?;
    let applied_hashes = applied_rows
        .into_iter()
        .filter_map(|row| row.try_get::<String, _>("hash").ok())
        .collect::<HashSet<_>>();

    for entry in entries {
        let Some(tag) = entry.get("tag").and_then(|value| value.as_str()) else {
            return Err("Migration journal entry tag is missing".to_string());
        };
        if applied_hashes.contains(tag) {
            continue;
        }

        let migration_path = migration_dir.join(format!("{tag}.sql"));
        let migration_sql = fs::read_to_string(&migration_path).map_err(|error| {
            format!(
                "Failed to read migration file '{}': {error}",
                migration_path.display()
            )
        })?;
        let statements = migration_sql
            .split("--> statement-breakpoint")
            .map(str::trim)
            .filter(|statement| !statement.is_empty())
            .collect::<Vec<_>>();

        let mut connection = pool
            .acquire()
            .await
            .map_err(|error| format!("Failed to acquire migration connection: {error}"))?;

        sqlx::query("BEGIN")
            .execute(&mut *connection)
            .await
            .map_err(|error| format!("Failed to begin migration '{tag}': {error}"))?;

        let mut failed: Option<String> = None;
        for statement in statements {
            if let Err(error) = sqlx::raw_sql(statement).execute(&mut *connection).await {
                failed = Some(format!("Failed to execute migration '{tag}': {error}"));
                break;
            }
        }

        if let Some(error) = failed {
            let _ = sqlx::query("ROLLBACK").execute(&mut *connection).await;
            return Err(error);
        }

        sqlx::query("INSERT INTO migrations (hash, created_at) VALUES (?, ?)")
            .bind(tag)
            .bind(now_millis())
            .execute(&mut *connection)
            .await
            .map_err(|error| format!("Failed to record migration '{tag}': {error}"))?;

        sqlx::query("COMMIT")
            .execute(&mut *connection)
            .await
            .map_err(|error| format!("Failed to commit migration '{tag}': {error}"))?;
    }

    Ok(())
}

/// 运行时保护规则来自数据库工件，而不是 Rust 内嵌业务 SQL。
pub(crate) async fn ensure_runtime_guards(
    pool: &Pool<Sqlite>,
    artifacts_dir: &Path,
) -> Result<(), String> {
    execute_sql_artifact_on_pool(pool, artifacts_dir, &["runtime", "guards.sql"]).await
}

/// 解析数据库目录。
pub(crate) fn resolve_database_contract_directory(app: &tauri::App) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        let exe_dir = std::env::current_exe()
            .map_err(|error| format!("Failed to resolve current exe: {error}"))?
            .parent()
            .ok_or_else(|| "Failed to resolve executable directory".to_string())?
            .to_path_buf();

        return exe_dir
            .parent()
            .and_then(|path| path.parent())
            .and_then(|path| path.parent())
            .map(|path| path.join("src").join("database"))
            .ok_or_else(|| "Failed to resolve project database contract directory".to_string());
    }

    Ok(app
        .path()
        .resource_dir()
        .map_err(|error| format!("Failed to resolve resource dir: {error}"))?
        .join("src")
        .join("database"))
}

/// 从统一数据库目录读取 SQL 工件。
pub(crate) fn read_sql_artifact(
    database_contract_dir: &Path,
    segments: &[&str],
) -> Result<String, String> {
    let path = segments
        .iter()
        .fold(database_contract_dir.to_path_buf(), |path, segment| {
            path.join(segment)
        });

    fs::read_to_string(&path).map_err(|error| {
        format!(
            "Failed to read database artifact '{}': {error}",
            path.display()
        )
    })
}

/// 在连接池上执行一个完整 SQL 工件，适合初始化场景。
pub(crate) async fn execute_sql_artifact_on_pool(
    pool: &Pool<Sqlite>,
    database_contract_dir: &Path,
    segments: &[&str],
) -> Result<(), String> {
    let sql = read_sql_artifact(database_contract_dir, segments)?;
    sqlx::raw_sql(&sql).execute(pool).await.map_err(|error| {
        format!(
            "Failed to execute database artifact '{:?}': {error}",
            segments
        )
    })?;
    Ok(())
}

/// 在已有连接上执行 SQL 工件，适合导入等需要共享事务上下文的流程。
pub(crate) async fn execute_sql_artifact_on_connection(
    connection: &mut sqlx::pool::PoolConnection<Sqlite>,
    database_contract_dir: &Path,
    segments: &[&str],
) -> Result<(), String> {
    let sql = read_sql_artifact(database_contract_dir, segments)?;
    sqlx::raw_sql(&sql)
        .execute(&mut **connection)
        .await
        .map_err(|error| {
            format!(
                "Failed to execute database artifact '{:?}': {error}",
                segments
            )
        })?;
    Ok(())
}

pub(crate) fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

async fn ensure_migrations_table(pool: &Pool<Sqlite>) -> Result<(), String> {
    sqlx::raw_sql(
        "CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );",
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to ensure migrations table: {error}"))?;
    Ok(())
}
