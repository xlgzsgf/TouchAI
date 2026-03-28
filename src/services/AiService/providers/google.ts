// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { ProviderApiTargets } from '@services/AiService/types';

import { z } from '@/utils/zod';

import { AiSdkProviderBase } from './shared/ai-sdk-base';

const googleModelsSchema = z.object({
    models: z.array(
        z.object({
            name: z.string(),
            displayName: z.string().nullable().optional(),
            supportedGenerationMethods: z.array(z.string()).nullable().optional(),
        })
    ),
});

/**
 * Gemini 官方适配器。
 */
export class GoogleProviderAdapter extends AiSdkProviderBase {
    readonly name = 'Google';
    readonly driver = 'google' as const;

    private sdkProvider = createGoogleGenerativeAI({
        apiKey: this.apiKey,
        baseURL: this.getApiTargets().sdkBaseUrl || undefined,
        headers: this.getCustomHeaders(),
        fetch: this.fetch,
    });

    protected createLanguageModel(modelId: string) {
        return this.sdkProvider.chat(modelId);
    }

    protected getDiscoveryHeaders(): Record<string, string> {
        return {
            ...(this.apiKey
                ? {
                      'x-goog-api-key': this.apiKey,
                  }
                : {}),
            ...this.getCustomHeaders(),
        };
    }

    protected parseModelList(payload: unknown) {
        const parsed = googleModelsSchema.parse(payload);

        return parsed.models
            .filter((model) => {
                const methods = model.supportedGenerationMethods ?? [];
                return (
                    methods.length === 0 ||
                    methods.some((method) =>
                        ['generatecontent', 'streamgeneratecontent'].includes(method.toLowerCase())
                    )
                );
            })
            .map((model) => {
                const normalizedId = model.name.replace(/^models\//, '');
                return {
                    id: normalizedId,
                    name: model.displayName || normalizedId,
                };
            });
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

        const sdkBaseUrl = `${this.normalizedBaseUrl}/v1beta`;
        return {
            normalizedBaseUrl: this.normalizedBaseUrl,
            sdkBaseUrl,
            generationTarget: `${sdkBaseUrl}/models/{model}:streamGenerateContent`,
            discoveryTarget: `${sdkBaseUrl}/models`,
        };
    }
}
