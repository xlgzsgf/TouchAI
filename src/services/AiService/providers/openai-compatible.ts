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
 * OpenAI-compatible 适配器。
 */
export class OpenAICompatibleProviderAdapter extends AiSdkProviderBase {
    readonly name = 'OpenAI Compatible';
    readonly driver = 'openai-compatible' as const;

    private sdkProvider = createOpenAICompatible({
        name: 'openai-compatible',
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

        return {
            normalizedBaseUrl: this.normalizedBaseUrl,
            sdkBaseUrl: this.normalizedBaseUrl,
            generationTarget: `${this.normalizedBaseUrl}/chat/completions`,
            discoveryTarget: `${this.normalizedBaseUrl}/models`,
        };
    }
}
