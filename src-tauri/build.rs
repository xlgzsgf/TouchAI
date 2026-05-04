use std::{
    fs,
    path::{Path, PathBuf},
};

use quote::ToTokens;
use tauri_codegen::embedded_assets::{AssetOptions, EmbeddedAssets};

fn main() {
    generate_database_embedded_assets().expect("failed to generate embedded database assets");

    let mcp_cap_path = std::path::Path::new("capabilities/mcp-bridge.json");

    #[cfg(all(feature = "mcp-bridge", debug_assertions))]
    {
        let cap = r#"{
    "identifier": "mcp-bridge",
    "description": "enables MCP bridge for development",
    "windows": [
        "main"
    ],
    "permissions": [
        "mcp-bridge:default"
    ]
}"#;

        std::fs::write(mcp_cap_path, cap).expect("failed to write mcp-bridge capability");
    }

    #[cfg(not(all(feature = "mcp-bridge", debug_assertions)))]
    {
        let _ = std::fs::remove_file(mcp_cap_path);
    }

    // Compile Everything SDK C source on Windows
    #[cfg(target_os = "windows")]
    {
        cc::Build::new()
            .file("vendor/everything/Everything.c")
            .compile("everything_sdk");
    }

    tauri_build::build()
}

fn generate_database_embedded_assets() -> Result<(), Box<dyn std::error::Error>> {
    let database_root = PathBuf::from("../src/database");
    emit_rerun_if_changed(&database_root.join("drizzle"))?;
    emit_rerun_if_changed(&database_root.join("artifacts"))?;
    let database_root = database_root.canonicalize()?;
    let embedded_root = prepare_database_embedded_asset_root(&database_root)?;

    // 数据库契约需要和前端资源一样走 Tauri 自己的 embedded-assets 编译链路，
    // 这样 release / 绿色版可以保持单文件自包含，而不是退回外部资源目录。
    // 同时只内联运行时真正会读取的 drizzle / artifacts SQL/JSON，避免把 schema、queries、测试文件一起打包进去。
    let assets = EmbeddedAssets::new(
        embedded_root,
        &AssetOptions::new(Default::default()),
        |_, _, _, _| Ok(()),
    )?;

    let output_path = PathBuf::from(std::env::var("OUT_DIR")?).join("database-assets.rs");
    fs::write(output_path, assets.to_token_stream().to_string())?;
    Ok(())
}

fn prepare_database_embedded_asset_root(
    database_root: &Path,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let embedded_root = PathBuf::from(std::env::var("OUT_DIR")?).join("database-contract-assets");
    if embedded_root.exists() {
        fs::remove_dir_all(&embedded_root)?;
    }
    fs::create_dir_all(&embedded_root)?;

    copy_database_contract_directory(
        &database_root.join("drizzle"),
        database_root,
        &embedded_root,
    )?;
    copy_database_contract_directory(
        &database_root.join("artifacts"),
        database_root,
        &embedded_root,
    )?;

    Ok(embedded_root)
}

fn copy_database_contract_directory(
    directory: &Path,
    database_root: &Path,
    embedded_root: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    for entry in fs::read_dir(directory)? {
        let path = entry?.path();
        if path.is_dir() {
            copy_database_contract_directory(&path, database_root, embedded_root)?;
            continue;
        }

        if !is_database_contract_asset(&path) {
            continue;
        }

        let relative_path = path.strip_prefix(database_root)?;
        let target_path = embedded_root.join(relative_path);
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&path, &target_path)?;
    }

    Ok(())
}

fn is_database_contract_asset(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|extension| extension.to_str()),
        Some("sql" | "json")
    )
}

fn emit_rerun_if_changed(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed={}", path.display());
    if path.is_dir() {
        for entry in fs::read_dir(path)? {
            emit_rerun_if_changed(&entry?.path())?;
        }
    }
    Ok(())
}
