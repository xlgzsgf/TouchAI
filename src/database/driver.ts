// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { drizzle } from 'drizzle-orm/sqlite-proxy';

import type { TauriDatabase } from './schema';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof createDrizzleDb>;

/**
 * 创建 Drizzle 实例，桥接 Tauri SQL 插件和 sqlite-proxy
 *
 * - Drizzle 的 sqlite-proxy 驱动期望查询结果以值数组形式返回（按列顺序）
 * - Tauri SQL 插件返回的是对象数组（键值对）
 * - 本适配器负责将对象数组转换为 Drizzle 期望的值数组格式
 *
 * - SELECT 查询：将对象转换为值数组，保持列顺序
 * - 非 SELECT 查询（INSERT/UPDATE/DELETE）：直接执行，返回空数组
 */
export function createDrizzleDb(tauriDb: TauriDatabase) {
    return drizzle<typeof schema>(
        async (sql, params, method) => {
            // 判断是否为 SELECT 查询
            const isSelect = sql.trimStart().substring(0, 6).toUpperCase() === 'SELECT';

            try {
                if (isSelect) {
                    // 执行查询，获取对象数组
                    const rows = await tauriDb.select<Record<string, unknown>>(
                        sql,
                        params as (string | number | null)[]
                    );

                    // 空结果直接返回
                    if (rows.length === 0) {
                        return { rows: [] };
                    }

                    // 获取列名（Tauri SQL 返回的对象键顺序与 SQL SELECT 列顺序一致）
                    const keys = Object.keys(rows[0]!);

                    // get 方法：返回单行的值数组
                    if (method === 'get') {
                        const firstRow = rows[0]!;
                        return { rows: keys.map((k) => firstRow[k]) };
                    }

                    // all 方法：返回多行的值数组
                    const values = rows.map((row) => keys.map((k) => row[k]));
                    return { rows: values };
                } else {
                    // 非 SELECT 查询：执行并返回空结果
                    await tauriDb.execute(sql, params as (string | number | null)[]);
                    return { rows: [] };
                }
            } catch (error) {
                console.error('Drizzle query error:', error);
                throw error;
            }
        },
        { schema, logger: import.meta.env.DEV }
    );
}
