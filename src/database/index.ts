// Copyright (c) 2025. 千诚. Licensed under GPL v3

import Database from '@tauri-apps/plugin-sql';
import type { Kysely } from 'kysely';
import { Kysely as KyselyInstance } from 'kysely';

import { createTauriSqlDialect } from './dialect';
import { MigrationManager } from './migrations';
import type { Database as DatabaseSchema, DatabaseOptions } from './schema';

/**
 * 数据库管理类
 * 提供数据库连接、Kysely 实例管理
 */
class DatabaseManager {
    private tauriDb: Database | null = null;
    private kyselyDb: Kysely<DatabaseSchema> | null = null;
    private dbPath: string = 'sqlite://../data/touchai.db';
    private migrationManager: MigrationManager | null = null;
    private initialized: boolean = false;

    /**
     * 初始化数据库连接和迁移
     * @param options 数据库配置选项
     */
    async init(options?: DatabaseOptions): Promise<void> {
        if (this.initialized) {
            console.warn('Database already initialized');
            return;
        }

        try {
            this.dbPath = options?.path || this.dbPath;
            this.tauriDb = await Database.load(this.dbPath);
            console.log(`Database initialized: ${this.dbPath}`);

            // 创建 Kysely 实例
            this.kyselyDb = new KyselyInstance<DatabaseSchema>({
                dialect: createTauriSqlDialect(this.tauriDb),
            });

            // 创建迁移管理器并运行迁移
            this.migrationManager = new MigrationManager(this.tauriDb);
            await this.migrationManager.runMigrations();

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * 获取 Kysely 数据库实例
     * @returns Kysely 实例
     * @throws 如果数据库未初始化
     */
    getKysely(): Kysely<DatabaseSchema> {
        if (!this.kyselyDb) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.kyselyDb;
    }

    /**
     * 获取原始 Tauri 数据库实例（用于迁移等特殊场景）
     * @returns Tauri Database 实例
     * @throws 如果数据库未初始化
     */
    getTauriDb(): Database {
        if (!this.tauriDb) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.tauriDb;
    }

    /**
     * 检查数据库是否已初始化
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * 关闭数据库连接
     */
    async close(): Promise<void> {
        if (this.kyselyDb) {
            await this.kyselyDb.destroy();
            this.kyselyDb = null;
        }
        if (this.tauriDb) {
            await this.tauriDb.close();
            this.tauriDb = null;
        }
        this.initialized = false;
        console.log('Database connection closed');
    }

    /**
     * 获取数据库路径
     */
    getPath(): string {
        return this.dbPath;
    }
}

// 导出单例实例
export const db = new DatabaseManager();

// 导出类型
export type { DatabaseOptions, Database as DatabaseSchema } from './schema';
