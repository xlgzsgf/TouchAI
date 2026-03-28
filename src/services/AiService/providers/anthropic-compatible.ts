// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { createAnthropic } from '@ai-sdk/anthropic';
import type { ProviderApiTargets } from '@services/AiService/types';

import { z } from '@/utils/zod';

import { AiSdkProviderBase } from './shared/ai-sdk-base';

const anthropicStyleModelsSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            display_name: z.string().optional(),
            displayName: z.string().optional(),
        })
    ),
});

/**
 * Anthropic-compatible 适配器。
 */
export class AnthropicCompatibleProviderAdapter extends AiSdkProviderBase {
    readonly name = 'Anthropic Compatible';
    readonly driver = 'anthropic-compatible' as const;

    private sdkProvider = createAnthropic({
        apiKey: this.apiKey,
        baseURL: this.getApiTargets().sdkBaseUrl || undefined,
        headers: this.getCustomHeaders(),
        fetch: this.fetch,
        name: 'anthropic-compatible.messages',
    });

    protected createLanguageModel(modelId: string) {
        return this.sdkProvider.chat(modelId);
    }

    protected getDiscoveryHeaders(): Record<string, string> {
        return {
            ...(this.apiKey
                ? {
                      'x-api-key': this.apiKey,
                  }
                : {}),
            'anthropic-version': '2023-06-01',
            ...this.getCustomHeaders(),
        };
    }

    protected parseModelList(payload: unknown) {
        const parsed = anthropicStyleModelsSchema.parse(payload);
        return parsed.data.map((model) => ({
            id: model.id,
            name: model.display_name || model.displayName || model.id,
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
            generationTarget: `${this.normalizedBaseUrl}/messages`,
            discoveryTarget: `${this.normalizedBaseUrl}/models`,
        };
    }
}
