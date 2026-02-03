// Copyright (c) 2025. 千诚. Licensed under GPL v3

import {
    findDefaultModelWithProvider,
    findMessagesBySessionId,
    findModelByProviderAndModelId,
    findModelsWithProvider,
    updateModelLastUsed,
} from '@database/queries';
import type { Model } from '@database/schema';

import { AnthropicProvider } from './providers/anthropic.ts';
import { OpenAiProvider } from './providers/openai';
import type { AiMessage, AiProvider, AiResponse, AiStreamChunk } from './types';

/**
 * 模型与服务商信息的联合类型
 */
export type ModelWithProvider = Model & {
    provider_name: string;
    provider_type: string;
    api_endpoint: string;
    api_key: string | null;
    provider_enabled: number;
    provider_logo: string;
};

/**
 * AI 服务管理器
 * 管理 AI 提供商并将请求路由到适当的提供商
 */
export class AiServiceManager {
    // 按服务商 ID 缓存提供商实例
    private providers = new Map<number, AiProvider>();

    /**
     * 获取全局默认模型（包含服务商信息）
     */
    async getActiveModel(): Promise<ModelWithProvider | null> {
        const defaultModel = await findDefaultModelWithProvider();

        if (!defaultModel) {
            console.error('[AiServiceManager] No default model found or provider disabled');
            return null;
        }

        return defaultModel as ModelWithProvider;
    }

    /**
     * 根据 provider_id 和 model_id 获取模型（包含服务商信息）
     */
    async getModelByProviderAndModelId(
        providerId: number,
        modelId: string
    ): Promise<ModelWithProvider | null> {
        const model = await findModelByProviderAndModelId(providerId, modelId);

        if (!model) {
            console.error(
                `[AiServiceManager] Model "${modelId}" from provider ${providerId} not found`
            );
            return null;
        }

        // 检查服务商是否启用
        if (model.provider_enabled === 0) {
            console.error(`[AiServiceManager] Provider for model "${modelId}" is disabled`);
            return null;
        }

        return model as ModelWithProvider;
    }

    /**
     * 内部方法：创建提供商实例
     */
    private _createProvider(
        providerType: string,
        apiEndpoint: string,
        apiKey?: string | null
    ): AiProvider {
        const normalizedEndpoint = this.normalizeEndpoint(apiEndpoint, providerType);
        const config = {
            apiEndpoint: normalizedEndpoint,
            apiKey: apiKey || undefined,
        };

        switch (providerType) {
            case 'openai':
                return new OpenAiProvider(config);
            case 'anthropic':
                return new AnthropicProvider(config);
            default:
                throw new Error(`Unknown provider type: ${providerType}`);
        }
    }

    /**
     * 获取或创建服务商的提供商实例
     */
    private getProvider(
        providerId: number,
        providerType: string,
        apiEndpoint: string,
        apiKey?: string | null
    ): AiProvider {
        // 检查缓存
        const cached = this.providers.get(providerId);
        if (cached) {
            return cached;
        }

        // 创建新实例
        const provider = this._createProvider(providerType, apiEndpoint, apiKey);
        this.providers.set(providerId, provider);
        return provider;
    }

    /**
     * 创建服务商的提供商实例（公共方法）
     */
    createProviderInstance(
        providerType: string,
        apiEndpoint: string,
        apiKey?: string | null
    ): AiProvider {
        return this._createProvider(providerType, apiEndpoint, apiKey);
    }

    /**
     * 清除指定服务商的缓存实例
     */
    clearProviderCache(providerId?: number): void {
        if (providerId !== undefined) {
            this.providers.delete(providerId);
        } else {
            this.providers.clear();
        }
    }

    /**
     * 发送 AI 请求
     */
    async request(
        prompt: string,
        sessionId?: number,
        modelIdOverride?: string,
        providerIdOverride?: number
    ): Promise<AiResponse> {
        // 使用覆盖模型或默认模型
        let activeModel: ModelWithProvider | null;

        if (modelIdOverride && providerIdOverride) {
            activeModel = await this.getModelByProviderAndModelId(
                providerIdOverride,
                modelIdOverride
            );
            if (!activeModel) {
                throw new Error(
                    `Model "${modelIdOverride}" from provider ${providerIdOverride} not found or disabled`
                );
            }
        } else {
            activeModel = await this.getActiveModel();
            if (!activeModel) {
                throw new Error('No active AI model configured');
            }
        }

        const provider = this.getProvider(
            activeModel.provider_id,
            activeModel.provider_type,
            activeModel.api_endpoint,
            activeModel.api_key
        );

        const messages = await this.buildMessages(prompt, sessionId);

        const response = await provider.request({
            model: activeModel.model_id,
            messages,
        });

        await updateModelLastUsed(activeModel.id);
        return response;
    }

    /**
     * 流式 AI 响应
     */
    async *stream(
        prompt: string,
        sessionId?: number,
        modelIdOverride?: string,
        providerIdOverride?: number
    ): AsyncGenerator<{ chunk: AiStreamChunk; model: ModelWithProvider }, void, unknown> {
        // 使用覆盖模型或默认模型
        let activeModel: ModelWithProvider | null;

        if (modelIdOverride && providerIdOverride) {
            activeModel = await this.getModelByProviderAndModelId(
                providerIdOverride,
                modelIdOverride
            );
            if (!activeModel) {
                throw new Error(
                    `Model "${modelIdOverride}" from provider ${providerIdOverride} not found or disabled`
                );
            }
        } else {
            activeModel = await this.getActiveModel();
            if (!activeModel) {
                console.error('[AiServiceManager] No active model found');
                throw new Error('No active AI model configured');
            }
        }

        const provider = this.getProvider(
            activeModel.provider_id,
            activeModel.provider_type,
            activeModel.api_endpoint,
            activeModel.api_key
        );

        const messages = await this.buildMessages(prompt, sessionId);

        for await (const chunk of provider.stream({
            model: activeModel.model_id,
            messages,
        })) {
            yield { chunk, model: activeModel };
        }

        await updateModelLastUsed(activeModel.id);
    }

    /**
     * 构建消息历史
     */
    private async buildMessages(prompt: string, sessionId?: number): Promise<AiMessage[]> {
        const messages: AiMessage[] = [];

        if (sessionId) {
            // 加载会话历史
            const history = await findMessagesBySessionId(sessionId);
            messages.push(
                ...history.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                }))
            );
        }

        messages.push({ role: 'user', content: prompt });
        return messages;
    }

    /**
     * 规范化地址，自动拼接 /v1（如果需要）
     */
    private normalizeEndpoint(endpoint: string, type: string): string {
        // 移除末尾的斜杠
        endpoint = endpoint.replace(/\/+$/, '');

        // 如果已经包含 /v1，直接返回
        if (endpoint.endsWith('/v1')) {
            return endpoint;
        }

        // 根据类型决定是否需要拼接 /v1
        switch (type) {
            case 'openai':
                return `${endpoint}/v1`;
            case 'anthropic':
                return `${endpoint}`;
            default:
                return endpoint;
        }
    }

    /**
     * 测试模型连接
     */
    async testModel(modelId: number): Promise<boolean> {
        const models = await findModelsWithProvider();
        const model = models.find((m) => m.id === modelId);

        if (!model) {
            throw new Error(`Model with id ${modelId} not found`);
        }

        const provider = this.getProvider(
            model.provider_id,
            model.provider_type,
            model.api_endpoint,
            model.api_key
        );

        return provider.testConnection();
    }
}

// 导出单例
export const aiService = new AiServiceManager();
