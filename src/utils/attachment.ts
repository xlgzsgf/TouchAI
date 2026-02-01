/*
 * Copyright (c) 2026. Qian Cheng. Licensed under GPL v3
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import {
    fullName as getFileName,
    icon as getFileIcon,
    size as getFileSize,
} from 'tauri-plugin-fs-pro-api';

export interface Attachment {
    id: string;
    type: 'image' | 'file';
    path: string;
    name: string;
    size?: number;
    preview?: string;
}

export async function createAttachment(type: 'image' | 'file', path: string): Promise<Attachment> {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const name = await getFileName(path);

    return {
        id,
        type,
        path,
        name,
        size: await getFileSize(path),
        preview: convertFileSrc(type == 'image' ? path : await getFileIcon(path, { size: 256 })),
    };
}
