// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { clearLlmMetadata, insertLlmMetadata } from '@database/queries/llmMetadata';
import type { NewLlmMetadata } from '@database/schema';

/**
 * API 返回的原始数据格式
 */
interface RawModelData {
    [providerId: string]: {
        models: {
            [modelId: string]: {
                id: string;
                name: string;
                attachment: boolean;
                modalities: {
                    input: string[];
                    output: string[];
                };
                open_weights: boolean;
                reasoning: boolean;
                release_date?: string;
                temperature: boolean;
                tool_call: boolean;
                knowledge?: string;
                limit?: {
                    context: number;
                    output: number;
                };
            };
        };
    };
}

/**
 * 从 API 更新模型元数据
 */
export async function updateModelMetadata(): Promise<void> {
    try {
        const response = await fetch('https://llm-metadata.pages.dev/api/all.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }

        const rawData: RawModelData = await response.json();

        // 转换数据格式
        const metadataList: NewLlmMetadata[] = [];
        const seenModelIds = new Set<string>();

        for (const providerId in rawData) {
            const provider = rawData[providerId];
            if (!provider?.models) continue;

            for (const modelId in provider.models) {
                const model = provider.models[modelId];
                if (!model) continue;

                // 跳过重复的 model_id
                if (seenModelIds.has(model.id)) {
                    continue;
                }
                seenModelIds.add(model.id);

                // 确保 modalities 存在且有效
                const modalities = model.modalities || { input: ['text'], output: ['text'] };

                metadataList.push({
                    model_id: model.id,
                    name: model.name,
                    attachment: model.attachment ? 1 : 0,
                    modalities: JSON.stringify(modalities),
                    open_weights: model.open_weights ? 1 : 0,
                    reasoning: model.reasoning ? 1 : 0,
                    release_date: model.release_date || null,
                    temperature: model.temperature ? 1 : 0,
                    tool_call: model.tool_call ? 1 : 0,
                    knowledge: model.knowledge || null,
                    limit: model.limit ? JSON.stringify(model.limit) : null,
                });
            }
        }

        // 清空旧数据并插入新数据
        await clearLlmMetadata();
        await insertLlmMetadata(metadataList);

        console.log(`[ModelMetadata] Updated ${metadataList.length} models`);
    } catch (error) {
        console.error('[ModelMetadata] Failed to update metadata:', error);
        throw error;
    }
}
