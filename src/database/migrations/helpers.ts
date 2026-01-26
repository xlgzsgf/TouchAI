// Copyright (c) 2025. 千诚. Licensed under GPL v3

import type { CreateTableBuilder, Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * 添加时间戳列
 */
export function withTimestamps<TB extends string, C extends string = never>(
    builder: CreateTableBuilder<TB, C>
) {
    return builder
        .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
        .addColumn('updated_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`));
}

/**
 * 创建 updated_at 触发器
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createUpdateTrigger(db: Kysely<any>, tableName: string): Promise<void> {
    await sql`
        CREATE TRIGGER IF NOT EXISTS ${sql.raw(`update_${tableName}_timestamp`)}
        AFTER UPDATE ON ${sql.table(tableName)}
        FOR EACH ROW
        BEGIN
            UPDATE ${sql.table(tableName)}
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.id;
        END
    `.execute(db);
}

/**
 * 删除 updated_at 触发器
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function dropUpdateTrigger(db: Kysely<any>, tableName: string): Promise<void> {
    await sql`DROP TRIGGER IF EXISTS ${sql.raw(`update_${tableName}_timestamp`)}`.execute(db);
}

/**
 * 创建索引
 */
export async function createIndex(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: Kysely<any>,
    indexName: string,
    tableName: string,
    columns: string[]
): Promise<void> {
    let builder = db.schema.createIndex(indexName).ifNotExists().on(tableName);

    for (const column of columns) {
        builder = builder.column(column);
    }

    await builder.execute();
}
