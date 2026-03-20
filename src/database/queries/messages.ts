// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { asc, count, eq, getTableColumns, or, sql } from 'drizzle-orm';

import { db } from '../index';
import { mcpToolLogs, messages } from '../schema';
import type { MessageCreateData, MessageEntity } from '../types';
import { findAttachmentsByMessageIds, type MessageAttachmentRow } from './attachments';
import { refreshSessionMetadata } from './sessions';

export interface MessageRow extends MessageEntity {
    attachments: MessageAttachmentRow[];
    tool_call_id: string | null;
    tool_name: string | null;
    tool_input: string | null;
    tool_log_ref_id: number | null;
    tool_status: string | null;
    tool_duration_ms: number | null;
    server_id: number | null;
}

const messageRowSelection = {
    ...getTableColumns(messages),
    tool_call_id: sql<string | null>`${mcpToolLogs.tool_call_id}`.as('tool_call_id'),
    tool_name: sql<string | null>`${mcpToolLogs.tool_name}`.as('tool_name'),
    tool_input: sql<string | null>`${mcpToolLogs.input}`.as('tool_input'),
    tool_log_ref_id: sql<number | null>`${mcpToolLogs.id}`.as('tool_log_ref_id'),
    tool_status: sql<string | null>`${mcpToolLogs.status}`.as('tool_status'),
    tool_duration_ms: sql<number | null>`${mcpToolLogs.duration_ms}`.as('tool_duration_ms'),
    server_id: sql<number | null>`${mcpToolLogs.server_id}`.as('server_id'),
};

/**
 * 根据会话 ID 查找所有消息（LEFT JOIN mcp_tool_logs）。
 *
 * 一条 tool_call 消息可能展开为多行（一次调用多个工具），
 * 调用方需按 message id 分组。
 *
 * @param sessionId 会话主键 ID。
 * @returns 带工具日志辅助信息的扁平消息行。
 */
export const findMessagesBySessionId = async (sessionId: number): Promise<MessageRow[]> => {
    const rows = await db
        .getDb()
        .select(messageRowSelection)
        .from(messages)
        .leftJoin(
            mcpToolLogs,
            or(eq(mcpToolLogs.message_id, messages.id), eq(messages.tool_log_id, mcpToolLogs.id))
        )
        .where(eq(messages.session_id, sessionId))
        .orderBy(asc(messages.created_at), asc(messages.id), asc(mcpToolLogs.id))
        .all();

    if (rows.length === 0) {
        return [];
    }

    // 分开查询，避免交叉JOIN后放大。
    const attachmentRows = await findAttachmentsByMessageIds(
        Array.from(new Set(rows.map((row) => row.id)))
    );
    const attachmentsByMessageId = new Map<number, MessageAttachmentRow[]>();

    for (const attachmentRow of attachmentRows) {
        const existing = attachmentsByMessageId.get(attachmentRow.message_id) ?? [];
        existing.push(attachmentRow);
        attachmentsByMessageId.set(attachmentRow.message_id, existing);
    }

    return rows.map((row) => ({
        ...row,
        attachments: attachmentsByMessageId.get(row.id) ?? [],
    }));
};

/**
 * 创建消息。
 *
 * **Side effect**: after inserting, this function calls {@link refreshSessionMetadata}
 * to recompute the parent session's `last_message_at`, `last_message_preview`,
 * `message_count`, and `provider_id`. Callers that batch-insert messages may want
 * to call `refreshSessionMetadata` manually instead to avoid redundant updates.
 *
 * @param data 消息初始数据。
 * @returns 新创建的消息记录。
 */
export const createMessage = async (data: MessageCreateData): Promise<MessageEntity> => {
    const createdMessage = await db.getDb().insert(messages).values(data).returning().get();

    if (!createdMessage || createdMessage.id === undefined) {
        throw new Error('Failed to create message');
    }

    // 统一从数据库重算摘要，避免 tool_call / tool_result 把历史会话预览污染成工具日志。
    await refreshSessionMetadata(createdMessage.session_id);
    return createdMessage;
};

/**
 * 统计所有消息数。
 *
 * @returns 当前数据库中的消息总数。
 */
export const countMessages = async (): Promise<number> => {
    const result = await db.getDb().select({ count: count() }).from(messages).get();

    return result?.count || 0;
};

/**
 * 删除所有消息。
 *
 * @returns Promise<void>
 */
export const deleteAllMessages = async (): Promise<void> => {
    await db.getDb().delete(messages).run();
};
