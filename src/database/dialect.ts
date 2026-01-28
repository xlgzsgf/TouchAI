// Copyright (c) 2025. 千诚. Licensed under GPL v3

import Database from '@tauri-apps/plugin-sql';
import type {
    DatabaseConnection,
    DatabaseIntrospector,
    Dialect,
    Driver,
    Kysely,
    QueryCompiler,
    QueryResult,
} from 'kysely';
import { SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely';

import type { SqlValue } from './schema';

/**
 * Tauri SQL 驱动
 * 将 Kysely 的查询适配到 Tauri SQL 插件
 */
class TauriSqlDriver implements Driver {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async init(): Promise<void> {
        // Tauri SQL 已经初始化，无需额外操作
    }

    async acquireConnection(): Promise<DatabaseConnection> {
        return new TauriSqlConnection(this.db);
    }

    async beginTransaction(): Promise<void> {
        // Tauri SQL 插件暂不支持显式事务
    }

    async commitTransaction(): Promise<void> {
        // Tauri SQL 插件暂不支持显式事务
    }

    async rollbackTransaction(): Promise<void> {
        // Tauri SQL 插件暂不支持显式事务
    }

    async releaseConnection(): Promise<void> {
        // 连接由 Tauri 管理，无需释放
    }

    async destroy(): Promise<void> {
        await this.db.close();
    }
}

/**
 * Tauri SQL 连接
 */
class TauriSqlConnection implements DatabaseConnection {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async executeQuery<O>(compiledQuery: {
        sql: string;
        parameters: readonly unknown[];
    }): Promise<QueryResult<O>> {
        const { sql, parameters } = compiledQuery;
        try {
            const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

            if (isSelect) {
                const rows = await this.db.select<O[]>(sql, parameters as SqlValue[]);
                return {
                    rows: rows || [],
                };
            } else {
                const result = await this.db.execute(sql, parameters as SqlValue[]);
                return {
                    rows: [],
                    numAffectedRows: BigInt(result.rowsAffected),
                    insertId:
                        result.lastInsertId !== undefined ? BigInt(result.lastInsertId) : undefined,
                };
            }
        } catch (error) {
            console.error('Query execution error:', error);
            throw error;
        }
    }

    // eslint-disable-next-line require-yield
    async *streamQuery<O>(): AsyncIterableIterator<QueryResult<O>> {
        throw new Error('Streaming is not supported by Tauri SQL plugin');
    }
}

/**
 * Tauri SQL 方言
 * 使用 SQLite 的查询编译器和适配器
 */
class TauriSqlDialect implements Dialect {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    createAdapter() {
        return new SqliteAdapter();
    }

    createDriver(): Driver {
        return new TauriSqlDriver(this.db);
    }

    createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
        return new SqliteIntrospector(db);
    }

    createQueryCompiler(): QueryCompiler {
        return new SqliteQueryCompiler();
    }
}

/**
 * 创建 Tauri SQL 方言实例
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTauriSqlDialect(db: Database | any): Dialect {
    return new TauriSqlDialect(db);
}
