// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { drizzle } from 'drizzle-orm/sqlite-proxy';

import type { SqlValue, TauriDatabase } from './schema';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof createDrizzleDb>;

/**
 * 缓存 SQL 的投影列名，避免重复解析。
 *
 * 本解析器仅针对 Drizzle ORM sqlite-proxy 驱动生成的 SQL 设计，不处理任意 SQL。
 * 已知不支持的语法（Drizzle 不会生成）：SELECT *、SELECT DISTINCT、反引号标识符。
 * 引号转义遵循 SQLite 标准：单引号用 '' 双写，双引号用 "" 双写。
 */
const projectionKeyCache = new Map<string, string[]>();

/**
 * 判断当前引号字符是否为 SQLite 双写转义（'it''s' 或 "col""name"）。
 * SQLite 用双写（而非反斜杠）转义引号。
 */
function isEscapedQuote(text: string, index: number, quoteChar: string): boolean {
    return index + 1 < text.length && text[index + 1] === quoteChar;
}

/**
 * 按顶层逗号拆分 SELECT / RETURNING 列，忽略函数和子查询内部逗号。
 */
function splitTopLevelSqlExpressions(segment: string): string[] {
    const expressions: string[] = [];
    let current = '';
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let index = 0; index < segment.length; index += 1) {
        const char = segment[index]!;

        if (char === "'" && !inDoubleQuote) {
            if (inSingleQuote) {
                if (isEscapedQuote(segment, index, "'")) {
                    // 双写单引号转义 '' — 跳过两个字符
                    current += "''";
                    index += 1;
                    continue;
                }
                inSingleQuote = false;
            } else {
                inSingleQuote = true;
            }
            current += char;
            continue;
        }

        if (char === '"' && !inSingleQuote) {
            if (inDoubleQuote) {
                if (isEscapedQuote(segment, index, '"')) {
                    // 双写双引号转义 "" — 跳过两个字符
                    current += '""';
                    index += 1;
                    continue;
                }
                inDoubleQuote = false;
            } else {
                inDoubleQuote = true;
            }
            current += char;
            continue;
        }

        if (!inSingleQuote && !inDoubleQuote) {
            if (char === '(') {
                depth += 1;
            } else if (char === ')') {
                depth = Math.max(0, depth - 1);
            } else if (char === ',' && depth === 0) {
                expressions.push(current.trim());
                current = '';
                continue;
            }
        }

        current += char;
    }

    if (current.trim()) {
        expressions.push(current.trim());
    }

    return expressions;
}

/**
 * 查找顶层关键字位置，忽略字符串和括号内部内容。
 */
function findTopLevelKeyword(sql: string, keyword: string, startIndex = 0): number {
    const lowerSql = sql.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let index = startIndex; index < sql.length; index += 1) {
        const char = sql[index]!;

        if (char === "'" && !inDoubleQuote) {
            if (inSingleQuote) {
                if (isEscapedQuote(sql, index, "'")) {
                    index += 1;
                    continue;
                }
                inSingleQuote = false;
            } else {
                inSingleQuote = true;
            }
            continue;
        }

        if (char === '"' && !inSingleQuote) {
            if (inDoubleQuote) {
                if (isEscapedQuote(sql, index, '"')) {
                    index += 1;
                    continue;
                }
                inDoubleQuote = false;
            } else {
                inDoubleQuote = true;
            }
            continue;
        }

        if (inSingleQuote || inDoubleQuote) {
            continue;
        }

        if (char === '(') {
            depth += 1;
            continue;
        }

        if (char === ')') {
            depth = Math.max(0, depth - 1);
            continue;
        }

        if (depth !== 0) {
            continue;
        }

        if (lowerSql.startsWith(lowerKeyword, index)) {
            const before = index === 0 ? ' ' : lowerSql[index - 1]!;
            const after = lowerSql[index + lowerKeyword.length] ?? ' ';
            const isBeforeBoundary = /[\s,(]/.test(before);
            const isAfterBoundary = /[\s(]/.test(after);

            if (isBeforeBoundary && isAfterBoundary) {
                return index;
            }
        }
    }

    return -1;
}

/**
 * 提取 SELECT / RETURNING 的投影片段。
 */
function extractProjectionSegment(sql: string): string | null {
    const returningIndex = findTopLevelKeyword(sql, 'returning');
    if (returningIndex !== -1) {
        return sql.slice(returningIndex + 'returning'.length).trim();
    }

    const selectIndex = findTopLevelKeyword(sql, 'select');
    if (selectIndex === -1) {
        return null;
    }

    const fromIndex = findTopLevelKeyword(sql, 'from', selectIndex + 'select'.length);
    if (fromIndex === -1) {
        return null;
    }

    return sql.slice(selectIndex + 'select'.length, fromIndex).trim();
}

/**
 * 从单个投影表达式中推断最终列名，优先使用显式 alias。
 */
function extractProjectionKey(expression: string): string | null {
    const aliasMatch = expression.match(/\s+as\s+"([^"]+)"\s*$/i);
    if (aliasMatch?.[1]) {
        return aliasMatch[1];
    }

    const quotedIdentifiers = Array.from(expression.matchAll(/"([^"]+)"/g), (match) => match[1]);
    if (quotedIdentifiers.length > 0) {
        return quotedIdentifiers[quotedIdentifiers.length - 1] ?? null;
    }

    const unquotedMatch = expression.match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/);
    return unquotedMatch?.[1] ?? null;
}

/**
 * 解析并缓存列顺序；解析失败时退回到返回对象的键顺序。
 */
function resolveProjectionKeys(sql: string, fallbackRow: Record<string, unknown>): string[] {
    const cached = projectionKeyCache.get(sql);
    if (cached) {
        return cached;
    }

    const projectionSegment = extractProjectionSegment(sql);
    if (!projectionSegment) {
        const fallback = Object.keys(fallbackRow);
        projectionKeyCache.set(sql, fallback);
        return fallback;
    }

    const parsedKeys = splitTopLevelSqlExpressions(projectionSegment)
        .map(extractProjectionKey)
        .filter((key): key is string => Boolean(key));

    if (parsedKeys.length === 0) {
        const fallback = Object.keys(fallbackRow);
        projectionKeyCache.set(sql, fallback);
        return fallback;
    }

    projectionKeyCache.set(sql, parsedKeys);
    return parsedKeys;
}

/**
 * 按列顺序把对象行转成数组，并为 LEFT JOIN 缺失列补 null。
 */
function mapObjectRowToArray(row: Record<string, unknown>, keys: string[]): unknown[] {
    // LEFT JOIN 的空列在 Tauri 返回值里有时会直接缺键；这里显式补 null，避免列位移污染主键/角色字段。
    return keys.map((key) => (Object.prototype.hasOwnProperty.call(row, key) ? row[key] : null));
}

/**
 * 创建 Drizzle 适配层，把 Tauri 的对象结果转换成 sqlite-proxy 需要的数组结果。
 */
export function createDrizzleDb(tauriDb: TauriDatabase) {
    return drizzle<typeof schema>(
        async (sql, params, method) => {
            const bindValues = params as SqlValue[];

            try {
                if (method === 'run') {
                    await tauriDb.execute(sql, bindValues);
                    return { rows: [] };
                }

                const rows = await tauriDb.select<Record<string, unknown>>(sql, bindValues);

                if (rows.length === 0) {
                    if (method === 'get') {
                        return { rows: undefined as unknown as unknown[] };
                    }

                    return { rows: [] };
                }

                // 历史恢复依赖多表 JOIN 的稳定列位序。不能再信任运行时对象键顺序，否则会把后续消息映射到错误列。
                const keys = resolveProjectionKeys(sql, rows[0]!);

                if (method === 'get') {
                    return { rows: mapObjectRowToArray(rows[0]!, keys) };
                }

                const values = rows.map((row) => mapObjectRowToArray(row, keys));
                return { rows: values };
            } catch (error) {
                console.error('Drizzle query error:', error);
                throw error;
            }
        },
        { schema, logger: import.meta.env.DEV }
    );
}
