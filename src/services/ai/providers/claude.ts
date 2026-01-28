// Copyright (c) 2025. 千诚. Licensed under GPL v3

import Anthropic from '@anthropic-ai/sdk';

import type {
    AiProvider,
    AiProviderConfig,
    AiRequestOptions,
    AiResponse,
    AiStreamChunk,
    ModelInfo,
} from '../types';

export class ClaudeProvider implements AiProvider {
    name = 'Claude';
    type = 'claude' as const;
    private client: Anthropic;

    constructor(private config: AiProviderConfig) {
        this.client = new Anthropic({
            apiKey: config.apiKey,
            baseURL: config.apiEndpoint,
            dangerouslyAllowBrowser: true,
        });
    }

    async request(options: AiRequestOptions): Promise<AiResponse> {
        const message = await this.client.messages.create({
            model: options.model,
            messages: options.messages as Anthropic.MessageParam[],
            max_tokens: options.maxTokens || this.config.maxTokens || 4096,
            temperature: options.temperature ?? this.config.temperature ?? 0.7,
            stream: false,
        });

        const firstBlock = message.content[0];
        const content = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';

        return {
            content,
            tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
            finishReason: message.stop_reason || undefined,
        };
    }

    async *stream(options: AiRequestOptions): AsyncGenerator<AiStreamChunk, void, unknown> {
        const stream = await this.client.messages.create({
            model: options.model,
            messages: options.messages as Anthropic.MessageParam[],
            max_tokens: options.maxTokens || this.config.maxTokens || 4096,
            temperature: options.temperature ?? this.config.temperature ?? 0.7,
            stream: true,
        });

        for await (const event of stream) {
            // 处理 thinking 内容块（extended thinking）
            if (event.type === 'content_block_start' && event.content_block.type === 'thinking') {
                // thinking 块开始，不需要特殊处理
                continue;
            }

            if (event.type === 'content_block_delta') {
                if (event.delta.type === 'thinking_delta') {
                    // 推理内容流式输出
                    yield { content: '', reasoning: event.delta.thinking, done: false };
                } else if (event.delta.type === 'text_delta') {
                    // 正常文本内容
                    yield { content: event.delta.text, done: false };
                }
            } else if (event.type === 'message_stop') {
                yield { content: '', done: true };
                return;
            }
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.client.messages.create({
                model: 'claude-3-haiku-20240307',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1,
            });
            return true;
        } catch {
            return false;
        }
    }

    async listModels(): Promise<ModelInfo[]> {
        const response = await this.client.models.list();
        return response.data.map((model) => ({
            id: model.id,
            name: model.display_name || model.id,
        }));
    }
}
