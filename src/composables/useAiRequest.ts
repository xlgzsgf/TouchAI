// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { computed, ref } from 'vue';

import { createAiRequest, updateAiRequest } from '@/database/queries';
import type { AiRequest } from '@/database/schema';
import { aiService } from '@/services/ai/manager';

export interface UseAiRequestOptions {
    sessionId?: number;
    onChunk?: (content: string) => void;
    onComplete?: (response: string) => void;
    onError?: (error: Error) => void;
}

export function useAiRequest(options: UseAiRequestOptions = {}) {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);
    const response = ref('');
    const currentRequest = ref<AiRequest | null>(null);

    const hasError = computed(() => error.value !== null);
    const hasResponse = computed(() => response.value.length > 0);

    async function sendRequest(prompt: string) {
        console.log('[useAiRequest] Starting AI request');
        console.log('[useAiRequest] Prompt:', prompt);

        if (!prompt.trim()) {
            console.error('[useAiRequest] Empty prompt provided');
            error.value = new Error('Prompt cannot be empty');
            return;
        }

        isLoading.value = true;
        error.value = null;
        response.value = '';

        const startTime = Date.now();
        console.log('[useAiRequest] Request start time:', new Date(startTime).toISOString());

        try {
            // 获取活动模型
            console.log('[useAiRequest] Fetching active model...');
            const model = await aiService.getActiveModel();
            if (!model) {
                console.error('[useAiRequest] No active model found');
                throw new Error('No active AI model configured. Please enable a model first.');
            }
            console.log('[useAiRequest] Active model:', model.name, `(ID: ${model.id})`);

            // 创建请求记录
            console.log('[useAiRequest] Creating request record in database...');
            currentRequest.value = await createAiRequest({
                session_id: options.sessionId || null,
                model_id: model.id,
                prompt,
                status: 'streaming',
            });
            console.log('[useAiRequest] Request record created with ID:', currentRequest.value.id);

            // 流式响应
            console.log('[useAiRequest] Starting streaming response...');
            const stream = aiService.stream(prompt, options.sessionId);

            let chunkCount = 0;
            for await (const { chunk } of stream) {
                if (chunk.content) {
                    chunkCount++;
                    response.value += chunk.content;
                    console.log(
                        `[useAiRequest] Received chunk #${chunkCount}, length: ${chunk.content.length}`
                    );
                    options.onChunk?.(chunk.content);
                }

                if (chunk.done) {
                    console.log('[useAiRequest] Stream completed');
                    break;
                }
            }

            // 更新请求记录
            const duration = Date.now() - startTime;
            console.log('[useAiRequest] Total duration:', duration, 'ms');
            console.log('[useAiRequest] Total chunks received:', chunkCount);
            console.log('[useAiRequest] Total response length:', response.value.length);

            await updateAiRequest(currentRequest.value.id, {
                response: response.value,
                status: 'completed',
                duration_ms: duration,
            });
            console.log('[useAiRequest] Request record updated to completed');

            options.onComplete?.(response.value);
            console.log('[useAiRequest] Request completed successfully');
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            console.error('[useAiRequest] Request failed:', err.message);
            console.error('[useAiRequest] Error stack:', err.stack);
            error.value = err;

            if (currentRequest.value) {
                console.log('[useAiRequest] Updating request record to failed status');
                await updateAiRequest(currentRequest.value.id, {
                    status: 'failed',
                    error_message: err.message,
                });
            }

            options.onError?.(err);
        } finally {
            isLoading.value = false;
            console.log('[useAiRequest] Request finished, isLoading set to false');
        }
    }

    function reset() {
        isLoading.value = false;
        error.value = null;
        response.value = '';
        currentRequest.value = null;
    }

    return {
        isLoading,
        error,
        response,
        hasError,
        hasResponse,
        sendRequest,
        reset,
    };
}
