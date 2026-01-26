// Copyright (c) 2025. 千诚. Licensed under GPL v3

import type Database from '@tauri-apps/plugin-sql';
import type { Generated } from 'kysely';
import { Kysely, sql } from 'kysely';

import { createTauriSqlDialect } from '../dialect';
import type { Database as DatabaseSchema, Migration, MigrationRecord } from '../schema';
import { migrations } from './index';

// Migration table schema
interface MigrationsTable {
    id: Generated<number>;
    version: number;
    name: string;
    applied_at: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

interface MigrationDatabase extends DatabaseSchema {
    migrations: MigrationsTable;
}

/**
 * 数据库迁移管理器
 */
export class MigrationManager {
    private readonly db: Database;
    private readonly migrationTableName = 'migrations';
    private kysely: Kysely<MigrationDatabase> | null = null;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * 获取 Kysely 实例
     */
    private getKysely(): Kysely<MigrationDatabase> {
        if (!this.kysely) {
            this.kysely = new Kysely<MigrationDatabase>({
                dialect: createTauriSqlDialect(this.db),
            });
        }
        return this.kysely;
    }

    /**
     * 初始化迁移表
     */
    private async initMigrationTable(): Promise<void> {
        const kysely = this.getKysely();

        await kysely.schema
            .createTable(this.migrationTableName)
            .ifNotExists()
            .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
            .addColumn('version', 'integer', (col) => col.notNull().unique())
            .addColumn('name', 'text', (col) => col.notNull())
            .addColumn('applied_at', 'text', (col) =>
                col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
            )
            .addColumn('created_at', 'text', (col) =>
                col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
            )
            .addColumn('updated_at', 'text', (col) =>
                col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
            )
            .execute();
    }

    /**
     * 获取已应用的迁移版本列表
     */
    private async getAppliedMigrations(): Promise<number[]> {
        const kysely = this.getKysely();

        const records = await kysely
            .selectFrom('migrations')
            .select('version')
            .orderBy('version', 'asc')
            .execute();

        return records.map((r) => r.version);
    }

    /**
     * 记录迁移应用
     */
    private async recordMigration(migration: Migration): Promise<void> {
        const kysely = this.getKysely();

        await kysely
            .insertInto('migrations')
            .values({
                version: migration.version,
                name: migration.name,
                applied_at: sql<string>`datetime('now')`,
            })
            .execute();
    }

    /**
     * 运行所有待处理的迁移
     */
    async runMigrations(): Promise<void> {
        // 初始化迁移表
        await this.initMigrationTable();

        // 获取已应用的迁移
        const appliedVersions = await this.getAppliedMigrations();
        console.log('Applied migrations:', appliedVersions);

        // 过滤待处理的迁移
        const pendingMigrations = migrations
            .filter((m) => !appliedVersions.includes(m.version))
            .sort((a, b) => a.version - b.version);

        if (pendingMigrations.length === 0) {
            console.log('No pending migrations');
            return;
        }

        console.log(`Running ${pendingMigrations.length} pending migrations...`);

        // 执行待处理的迁移
        for (const migration of pendingMigrations) {
            try {
                console.log(`Applying migration ${migration.version}: ${migration.name}`);
                await migration.up({
                    execute: this.db.execute.bind(this.db),
                    select: this.db.select.bind(this.db),
                    close: async () => {
                        await this.db.close();
                    },
                });
                await this.recordMigration(migration);
                console.log(`Migration ${migration.version} applied successfully`);
            } catch (error) {
                console.error(`Failed to apply migration ${migration.version}:`, error);
                throw error;
            }
        }

        console.log('All migrations completed successfully');
    }

    /**
     * 回滚指定版本的迁移
     */
    async rollback(version: number): Promise<void> {
        const migration = migrations.find((m) => m.version === version);

        if (!migration) {
            throw new Error(`Migration version ${version} not found`);
        }

        if (!migration.down) {
            throw new Error(`Migration version ${version} does not have a down function`);
        }

        try {
            console.log(`Rolling back migration ${version}: ${migration.name}`);
            await migration.down({
                execute: this.db.execute.bind(this.db),
                select: this.db.select.bind(this.db),
                close: async () => {
                    await this.db.close();
                },
            });

            const kysely = this.getKysely();
            await kysely.deleteFrom('migrations').where('version', '=', version).execute();

            console.log(`Migration ${version} rolled back successfully`);
        } catch (error) {
            console.error(`Failed to rollback migration ${version}:`, error);
            throw error;
        }
    }

    /**
     * 获取迁移历史
     */
    async getMigrationHistory(): Promise<MigrationRecord[]> {
        const kysely = this.getKysely();

        const results = await kysely
            .selectFrom('migrations')
            .selectAll()
            .orderBy('version', 'desc')
            .execute();

        return results as MigrationRecord[];
    }

    /**
     * 清理资源
     */
    async destroy(): Promise<void> {
        if (this.kysely) {
            await this.kysely.destroy();
            this.kysely = null;
        }
    }
}
