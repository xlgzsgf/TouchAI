// Copyright (c) 2026. 千诚. Licensed under GPL v3

import type { ProviderDriver } from '@database/schema';
import type {
    AiProvider,
    AiProviderConfig,
    AiRequestOptions,
    AiResponse,
    JsonObject,
    ModelInfo,
    ProviderApiTargets,
    ProviderConfigJson,
} from '@services/AiService/types';
import { type FinishReason, type LanguageModel, streamText } from 'ai';

import { safeParseJsonWithSchema, z } from '@/utils/zod';

import { buildModelMessages, buildToolSet } from './ai-sdk-messages';
import { createAiSdkStreamProcessor } from './ai-sdk-stream';
import { createTauriFetch } from './tauri-fetch';

const providerConfigJsonSchema = z.object({
    headers: z.record(z.string(), z.string()).optional(),
    queryParams: z.record(z.string(), z.string()).optional(),
});

/**
 * base URL 只负责移除尾部斜杠，绝不追加供应商路径。
 */
export function normalizeProviderBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
}

export function parseProviderConfigJson(configJson?: string | null): ProviderConfigJson {
    return safeParseJsonWithSchema(providerConfigJsonSchema, configJson, {});
}

function buildUrlWithQueryParams(target: string, queryParams: Record<string, string>): string {
    if (Object.keys(queryParams).length === 0 || !target) {
        return target;
    }

    const url = new URL(target);
    for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
    }

    return url.toString();
}

function normalizeFinishReason(reason: FinishReason | undefined): FinishReason {
    return reason ?? 'stop';
}

/**
 * Vercel AI SDK provider 适配层基类。
 *
 * 公共职责只保留在这里：base URL 规范化、Tauri fetch、headers/query params、
 * 目标 API 预览，以及统一的 listModels / testConnection / stream 包装。
 */
export abstract class AiSdkProviderBase implements AiProvider {
    readonly normalizedBaseUrl: string;
    protected readonly apiKey?: string;
    protected readonly config: ProviderConfigJson;
    protected readonly fetch: typeof fetch;

    abstract readonly name: string;
    abstract readonly driver: ProviderDriver;

    constructor(config: AiProviderConfig) {
        this.normalizedBaseUrl = normalizeProviderBaseUrl(config.apiEndpoint);
        this.apiKey = config.apiKey?.trim() || undefined;
        this.config = config.config ?? {};
        this.fetch = this.createProviderFetch();
    }

    async request(options: AiRequestOptions): Promise<AiResponse> {
        let content = '';
        let finishReason: string | undefined;

        for await (const chunk of this.stream(options)) {
            content += chunk.content;
            if (chunk.done) {
                finishReason = chunk.finishReason;
            }
        }

        return {
            content,
            finishReason,
        };
    }

    async *stream(options: AiRequestOptions) {
        const processor = createAiSdkStreamProcessor();
        const result = streamText({
            model: this.createLanguageModel(options.model),
            messages: buildModelMessages(options.messages),
            tools: buildToolSet(options.tools),
            abortSignal: options.signal,
            maxOutputTokens: options.maxTokens,
            providerOptions: this.getStreamProviderOptions(options),
            includeRawChunks: this.shouldIncludeRawChunks(),
        });

        for await (const part of result.fullStream) {
            if (part.type === 'finish') {
                yield processor.buildFinishChunk(normalizeFinishReason(part.finishReason));
                return;
            }

            for (const chunk of processor.consumePart(part)) {
                yield chunk;
            }
        }

        yield processor.buildFinishChunk('stop');
    }

    async listModels(): Promise<ModelInfo[]> {
        const { discoveryTarget } = this.getApiTargets();
        if (!discoveryTarget) {
            throw new Error('Provider base URL is empty');
        }

        const response = await this.fetch(discoveryTarget, {
            method: 'GET',
            headers: this.getDiscoveryHeaders(),
        });
        const payload = await this.readJsonResponse(response);
        return this.parseModelList(payload);
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.listModels();
            return true;
        } catch {
            return false;
        }
    }

    protected createProviderFetch(): typeof fetch {
        const tauriFetch = createTauriFetch();
        const queryParams = this.config.queryParams ?? {};

        return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const rawUrl =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.toString()
                      : input.url;
            const requestUrl = buildUrlWithQueryParams(rawUrl, queryParams);
            return tauriFetch(requestUrl, init);
        }) as typeof fetch;
    }

    protected async readJsonResponse(response: Response): Promise<unknown> {
        if (!response.ok) {
            const message = await response.text();
            throw new Error(`HTTP ${response.status}: ${message || response.statusText}`);
        }

        return response.json();
    }

    protected getCustomHeaders(): Record<string, string> {
        return {
            ...(this.config.headers ?? {}),
        };
    }

    /**
     * 允许 provider 在单次请求级别注入 AI SDK providerOptions。
     */
    protected getStreamProviderOptions(
        options: AiRequestOptions
    ): Record<string, JsonObject> | undefined {
        void options;
        return undefined;
    }

    /**
     * 仅在需要 provider 原始 chunk 做协议修补时开启 raw chunks，避免其余 provider 产生额外流噪音。
     */
    protected shouldIncludeRawChunks(): boolean {
        return false;
    }

    protected abstract createLanguageModel(modelId: string): LanguageModel;
    protected abstract getDiscoveryHeaders(): Record<string, string>;
    protected abstract parseModelList(payload: unknown): ModelInfo[];
    abstract getApiTargets(): ProviderApiTargets;
}
