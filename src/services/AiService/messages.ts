// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { findMessagesBySessionId } from '@database/queries';

import {
    type Index,
    isAttachmentSupported,
    readAttachmentAsBase64,
    readAttachmentAsText,
} from './attachments';
import type { AiContentPart, AiMessage } from './types';

interface BuildRequestMessagesOptions {
    prompt: string;
    sessionId?: number;
    attachments?: Index[];
}

interface BuildUnifiedMessagesOptions {
    prompt: string;
    history: Array<Pick<AiMessage, 'role'> & { content: string }>;
    attachments?: Index[];
}

async function buildAttachmentParts(attachments: Index[]): Promise<AiContentPart[]> {
    const parts: AiContentPart[] = [];
    const usableAttachments = attachments.filter((attachment) => isAttachmentSupported(attachment));

    for (const attachment of usableAttachments) {
        try {
            if (attachment.type === 'image') {
                const { data, mimeType } = await readAttachmentAsBase64(attachment);
                parts.push({ type: 'image', mimeType, data });
                continue;
            }

            const { content, isBinary } = await readAttachmentAsText(attachment);
            parts.push({
                type: 'file',
                name: attachment.name,
                content,
                isBinary,
            });
        } catch (error) {
            console.error('[AiServiceManager] Failed to read attachment:', error);
        }
    }

    return parts;
}

async function buildUnifiedMessages(options: BuildUnifiedMessagesOptions): Promise<AiMessage[]> {
    const { prompt, history, attachments = [] } = options;
    const messages: AiMessage[] = history.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));

    const attachmentParts = await buildAttachmentParts(attachments);
    const userContent =
        attachmentParts.length > 0
            ? ([{ type: 'text', text: prompt }, ...attachmentParts] as AiContentPart[])
            : prompt;

    messages.push({ role: 'user', content: userContent });
    return messages;
}

/**
 * 组装一次模型请求所需消息：会话历史 + 当前用户输入 + 附件。
 */
export async function buildRequestMessages(
    options: BuildRequestMessagesOptions
): Promise<AiMessage[]> {
    const history = options.sessionId
        ? await findMessagesBySessionId({ sessionId: options.sessionId })
        : [];

    return buildUnifiedMessages({
        prompt: options.prompt,
        history,
        attachments: options.attachments,
    });
}
