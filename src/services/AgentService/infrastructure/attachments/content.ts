/*
 * Copyright (c) 2026. Qian Cheng. Licensed under GPL v3
 */

import { convertFileSrc } from '@tauri-apps/api/core';

import type {
    AiContentPart,
    AttachmentPromptMeta,
    AttachmentTransportMode,
} from '../../contracts/protocol';
import { isAttachmentSupported } from './support';
import type { AttachmentIndex } from './types';

const BASE64_CHUNK_SIZE = 0x8000;
const BINARY_REPLACEMENT_RATIO_THRESHOLD = 0.01;

async function readAttachmentBuffer(path: string): Promise<ArrayBuffer> {
    const response = await fetch(convertFileSrc(path));
    if (!response.ok) {
        throw new Error(`Failed to read attachment: ${response.statusText}`);
    }
    return response.arrayBuffer();
}

function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
        binary += String.fromCharCode(...bytes.subarray(index, index + BASE64_CHUNK_SIZE));
    }
    return btoa(binary);
}

/**
 * 将附件内容读取为 Base64。
 *
 * @param attachment 前端附件引用。
 * @returns Base64 数据与 MIME 类型。
 */
export async function readAttachmentAsBase64(
    attachment: AttachmentIndex
): Promise<{ data: string; mimeType: string }> {
    const buffer = await readAttachmentBuffer(attachment.path);
    return {
        data: bufferToBase64(buffer),
        mimeType: attachment.mimeType || 'image/png',
    };
}

/**
 * 将附件内容读取为文本；若检测到二进制内容则回退为 Base64。
 *
 * @param attachment 前端附件引用。
 * @returns 文本内容，以及是否按二进制处理。
 */
export async function readAttachmentAsText(
    attachment: AttachmentIndex
): Promise<{ content: string; isBinary: boolean }> {
    const buffer = await readAttachmentBuffer(attachment.path);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(buffer);
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    const isBinary =
        text.includes('\u0000') ||
        replacementCount > Math.max(text.length * BINARY_REPLACEMENT_RATIO_THRESHOLD, 2);

    if (isBinary) {
        return { content: bufferToBase64(buffer), isBinary: true };
    }

    return { content: text, isBinary: false };
}

export function buildAttachmentAlias(order: number): string {
    return `A${order + 1}`;
}

export function buildAttachmentPromptMetas(attachments: AttachmentIndex[]): AttachmentPromptMeta[] {
    return attachments.map((attachment, order) => ({
        alias: buildAttachmentAlias(order),
        order,
        type: attachment.type,
        name: attachment.name,
        mimeType: attachment.mimeType ?? null,
        originPath: attachment.originPath,
        attachmentId: attachment.attachmentId ?? null,
        hash: attachment.hash ?? null,
    }));
}

export function formatAttachmentAnchorText(meta: AttachmentPromptMeta): string {
    return [
        `[Attachment ${meta.alias}]`,
        `name: ${meta.name}`,
        `type: ${meta.type}`,
        `origin_path: ${meta.originPath}`,
        `mime_type: ${meta.mimeType ?? 'unknown'}`,
    ].join('\n');
}

export async function resolveAttachmentTransportMode(
    attachment: AttachmentIndex
): Promise<AttachmentTransportMode> {
    if (attachment.type === 'image') {
        return 'inline-image';
    }

    const { isBinary } = await readAttachmentAsText(attachment);
    return isBinary ? 'inline-base64' : 'inline-text';
}

/**
 * 将附件转换为可送入模型的统一内容片段。
 */
export async function buildAttachmentParts(
    attachments: AttachmentIndex[]
): Promise<AiContentPart[]> {
    const parts: AiContentPart[] = [];
    // 同一会话内模型可能切换，这里静默跳过当前模型不支持的附件，避免整轮失败。
    const usableAttachments = attachments.filter((attachment) => isAttachmentSupported(attachment));
    const metas = buildAttachmentPromptMetas(usableAttachments);

    for (const [index, attachment] of usableAttachments.entries()) {
        const meta = metas[index]!;
        try {
            if (attachment.type === 'image') {
                const { data, mimeType } = await readAttachmentAsBase64(attachment);
                parts.push(
                    { type: 'text', text: formatAttachmentAnchorText(meta) },
                    { type: 'image', mimeType, data, meta }
                );
                continue;
            }

            const { content, isBinary } = await readAttachmentAsText(attachment);
            parts.push(
                { type: 'text', text: formatAttachmentAnchorText(meta) },
                {
                    type: 'file',
                    name: attachment.name,
                    content,
                    isBinary,
                    meta,
                }
            );
        } catch (error) {
            console.error('[AttachmentContent] Failed to read attachment:', error);
        }
    }

    return parts;
}
