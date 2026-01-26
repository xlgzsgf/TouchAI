// Copyright (c) 2025. 千诚. Licensed under GPL v3

import {
    findEnabledModelsByPriority,
    findMessagesBySessionId,
    updateModelLastUsed,
} from '@/database/queries';
import type { Model } from '@/database/schema';

import { ClaudeProvider } from './providers/claude';
import { OllamaProvider } from './providers/ollama';
import { OpenAiProvider } from './providers/openai';
import type { AiMessage, AiProvider, AiResponse, AiStreamChunk } from './types';

/**
 * AI 服务管理器
 * 管理 AI 提供商并将请求路由到适当的提供商
 */
export class AiServiceManager {
    private providers = new Map<number, AiProvider>();

    /**
     * 获取优先级最高的启用模型
     */
    async getActiveModel(): Promise<Model | null> {
        const models = await findEnabledModelsByPriority();
        return models[0] || null;
    }

    /**
     * 获取或创建模型的提供商
     */
    private getProvider(model: Model): AiProvider {
        if (this.providers.has(model.id)) {
            return this.providers.get(model.id)!;
        }

        // 获取 endpoint 并自动拼接 /v1（如果需要）
        const baseEndpoint = model.api_endpoint || this.getDefaultBaseEndpoint(model.type);
        const apiEndpoint = this.normalizeEndpoint(baseEndpoint, model.type);

        const config = {
            apiEndpoint,
            apiKey: model.api_key || undefined,
            maxTokens: model.max_tokens || undefined,
            temperature: model.temperature || undefined,
        };

        let provider: AiProvider;
        switch (model.type) {
            case 'openai':
                provider = new OpenAiProvider(config);
                break;
            case 'claude':
                provider = new ClaudeProvider(config);
                break;
            case 'ollama':
                provider = new OllamaProvider(config);
                break;
            default:
                throw new Error(`Unknown model type: ${model.type}`);
        }

        this.providers.set(model.id, provider);
        return provider;
    }

    /**
     * 发送 AI 请求
     */
    async request(prompt: string, sessionId?: number): Promise<AiResponse> {
        const model = await this.getActiveModel();
        if (!model) {
            throw new Error('No active AI model configured');
        }

        const provider = this.getProvider(model);
        const messages = await this.buildMessages(prompt, sessionId);

        const response = await provider.request({
            model: model.model_id,
            messages,
        });

        await updateModelLastUsed(model.id);
        return response;
    }

    /**
     * 流式 AI 响应
     */
    async *stream(
        prompt: string,
        sessionId?: number
    ): AsyncGenerator<{ chunk: AiStreamChunk; model: Model }, void, unknown> {
        console.log('[AiServiceManager] Starting stream request');
        console.log('[AiServiceManager] Session ID:', sessionId || 'none');

        const model = await this.getActiveModel();
        if (!model) {
            console.error('[AiServiceManager] No active model found');
            throw new Error('No active AI model configured');
        }
        console.log('[AiServiceManager] Using model:', model.name, `(${model.type})`);

        const provider = this.getProvider(model);
        console.log('[AiServiceManager] Provider created:', provider.name);

        const messages = await this.buildMessages(prompt, sessionId);
        console.log('[AiServiceManager] Built message history with', messages.length, 'messages');

        console.log('[AiServiceManager] Starting provider stream...');
        let chunkIndex = 0;
        for await (const chunk of provider.stream({
            model: model.model_id,
            messages,
        })) {
            chunkIndex++;
            if (chunk.content) {
                console.log(`[AiServiceManager] Yielding chunk #${chunkIndex}`);
            }
            yield { chunk, model };
        }

        console.log('[AiServiceManager] Stream completed, total chunks:', chunkIndex);
        console.log('[AiServiceManager] Updating model last used time');
        await updateModelLastUsed(model.id);
        console.log('[AiServiceManager] Stream request finished');
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
     * 获取默认基础端点（不含 /v1）
     */
    private getDefaultBaseEndpoint(type: string): string {
        switch (type) {
            case 'openai':
                return 'https://api.openai.com';
            case 'claude':
                return 'https://api.anthropic.com';
            case 'ollama':
                return 'http://localhost:11434';
            default:
                return '';
        }
    }

    /**
     * 规范化端点，自动拼接 /v1（如果需要）
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
            case 'claude':
                return `${endpoint}/v1`;
            case 'ollama':
                // Ollama 不需要 /v1
                return endpoint;
            default:
                return endpoint;
        }
    }

    /**
     * 测试模型连接
     */
    async testModel(modelId: number): Promise<boolean> {
        const models = await findEnabledModelsByPriority();
        const model = models.find((m) => m.id === modelId);

        if (!model) {
            throw new Error(`Model with id ${modelId} not found`);
        }

        const provider = this.getProvider(model);
        return provider.testConnection();
    }
}

// 导出单例
export const aiService = new AiServiceManager();
