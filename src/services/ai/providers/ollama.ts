// Copyright (c) 2025. 千诚. Licensed under GPL v3

import type {
    AiProvider,
    AiProviderConfig,
    AiRequestOptions,
    AiResponse,
    AiStreamChunk,
} from '../types';

export class OllamaProvider implements AiProvider {
    name = 'Ollama';
    type = 'ollama' as const;

    constructor(private config: AiProviderConfig) {}

    async request(options: AiRequestOptions): Promise<AiResponse> {
        const response = await fetch(`${this.config.apiEndpoint}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options.model,
                messages: options.messages,
                stream: false,
                options: {
                    temperature: options.temperature ?? this.config.temperature ?? 0.7,
                    num_predict: options.maxTokens || this.config.maxTokens,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.statusText} - ${error}`);
        }

        const data = await response.json();
        return {
            content: data.message.content,
            tokensUsed: data.eval_count,
            finishReason: data.done_reason,
        };
    }

    async *stream(options: AiRequestOptions): AsyncGenerator<AiStreamChunk, void, unknown> {
        const response = await fetch(`${this.config.apiEndpoint}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options.model,
                messages: options.messages,
                stream: true,
                options: {
                    temperature: options.temperature ?? this.config.temperature ?? 0.7,
                    num_predict: options.maxTokens || this.config.maxTokens,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${response.statusText} - ${error}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No response body');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter((line) => line.trim());

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);

                    if (parsed.message?.content) {
                        yield { content: parsed.message.content, done: false };
                    }

                    if (parsed.done) {
                        yield { content: '', done: true };
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse Ollama response:', e);
                }
            }
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.apiEndpoint}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }
}
