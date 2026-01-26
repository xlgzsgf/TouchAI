// Copyright (c) 2025. 千诚. Licensed under GPL v3

import OpenAI from 'openai';

import type {
    AiProvider,
    AiProviderConfig,
    AiRequestOptions,
    AiResponse,
    AiStreamChunk,
} from '../types';

export class OpenAiProvider implements AiProvider {
    name = 'OpenAI';
    type = 'openai' as const;
    private client: OpenAI;

    constructor(private config: AiProviderConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.apiEndpoint,
            dangerouslyAllowBrowser: true,
        });
    }

    async request(options: AiRequestOptions): Promise<AiResponse> {
        const completion = await this.client.chat.completions.create({
            model: options.model,
            messages: options.messages as OpenAI.Chat.ChatCompletionMessageParam[],
            max_tokens: options.maxTokens || this.config.maxTokens,
            temperature: options.temperature ?? this.config.temperature ?? 0.7,
            stream: false,
        });

        const firstChoice = completion.choices[0];
        const content = firstChoice?.message?.content || '';

        return {
            content,
            tokensUsed: completion.usage?.total_tokens,
            finishReason: firstChoice?.finish_reason,
        };
    }

    async *stream(options: AiRequestOptions): AsyncGenerator<AiStreamChunk, void, unknown> {
        const stream = await this.client.chat.completions.create({
            model: options.model,
            messages: options.messages as OpenAI.Chat.ChatCompletionMessageParam[],
            max_tokens: options.maxTokens || this.config.maxTokens,
            temperature: options.temperature ?? this.config.temperature ?? 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            const finishReason = chunk.choices[0]?.finish_reason;

            if (content) {
                yield { content, done: false };
            }

            if (finishReason) {
                yield { content: '', done: true };
                return;
            }
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.client.models.list();
            return true;
        } catch {
            return false;
        }
    }
}
