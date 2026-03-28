// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ProviderApiTargets } from '@services/AiService/types';

import { z } from '@/utils/zod';

import { AiSdkProviderBase } from './shared/ai-sdk-base';

const openAiStyleModelsSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
        })
    ),
});

/**
 * xAI 官方适配器，走 OpenAI-compatible 传输。
 */
export class XaiProviderAdapter extends AiSdkProviderBase {
    readonly name = 'xAI';
    readonly driver = 'xai' as const;

    private sdkProvider = createOpenAICompatible({
        name: 'xai',
        apiKey: this.apiKey,
        baseURL: this.getApiTargets().sdkBaseUrl,
        headers: this.getCustomHeaders(),
        fetch: this.fetch,
    });

    protected createLanguageModel(modelId: string) {
        return this.sdkProvider.chatModel(modelId);
    }

    protected getDiscoveryHeaders(): Record<string, string> {
        return {
            ...(this.apiKey
                ? {
                      Authorization: `Bearer ${this.apiKey}`,
                  }
                : {}),
            ...this.getCustomHeaders(),
        };
    }

    protected parseModelList(payload: unknown) {
        const parsed = openAiStyleModelsSchema.parse(payload);
        return parsed.data.map((model) => ({
            id: model.id,
            name: model.id,
        }));
    }

    getApiTargets(): ProviderApiTargets {
        if (!this.normalizedBaseUrl) {
            return {
                normalizedBaseUrl: '',
                sdkBaseUrl: '',
                generationTarget: '',
                discoveryTarget: '',
            };
        }

        const sdkBaseUrl = `${this.normalizedBaseUrl}/v1`;
        return {
            normalizedBaseUrl: this.normalizedBaseUrl,
            sdkBaseUrl,
            generationTarget: `${sdkBaseUrl}/chat/completions`,
            discoveryTarget: `${sdkBaseUrl}/models`,
        };
    }
}
