/**
 * SearchView 请求层。
 * 收口请求提交、排队与会话续发逻辑，让输入层与页面层保持解耦。
 */
import { type ConversationMessage, useAgent } from '@composables/useAgent';
import { type Index, isAttachmentSupported } from '@services/AiService/attachments';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { type Ref, ref } from 'vue';

import type { PendingRequest, SearchModelOverride } from '../types';

interface UseSearchRequestFlowOptions {
    modelOverride: Ref<SearchModelOverride>;
    clearDraft: (options?: { preserveModelTag?: boolean }) => void;
    getSupportedAttachments: () => Index[];
    getUnsupportedAttachmentMessage: () => string | null;
}

/**
 * 搜索页请求流。
 * 负责 AI 请求排队、提交校验和会话续发，不再直接管理附件输入域或编辑器标签。
 *
 * @param options 页面状态与请求前置依赖。
 * @returns 请求流状态与页面事件处理函数。
 */
export function useSearchRequestFlow(options: UseSearchRequestFlowOptions) {
    const { modelOverride, clearDraft, getSupportedAttachments, getUnsupportedAttachmentMessage } =
        options;

    const pendingRequest = ref<PendingRequest | null>(null);
    const isWaitingForCompletion = ref(false);

    const { isLoading, error, conversationHistory, sendRequest, cancel, clearConversation } =
        useAgent({
            onComplete: async () => {
                if (!pendingRequest.value) {
                    return;
                }

                const {
                    query,
                    attachments: pendingAttachments,
                    modelId,
                    providerId,
                } = pendingRequest.value;
                pendingRequest.value = null;
                isWaitingForCompletion.value = false;

                clearDraft({ preserveModelTag: true });

                await sendRequest(query, pendingAttachments, modelId, providerId);
            },
        });

    async function handleSubmit(query: string) {
        const unsupportedAttachmentMessage = getUnsupportedAttachmentMessage();
        if (unsupportedAttachmentMessage) {
            sendNotification({ title: 'TouchAI', body: unsupportedAttachmentMessage });
            return;
        }

        if (isLoading.value) {
            if (pendingRequest.value) {
                return;
            }

            const selectedModelId = modelOverride.value.modelId;
            const selectedProviderId = modelOverride.value.providerId;
            pendingRequest.value = {
                query,
                attachments: getSupportedAttachments(),
                modelId: selectedModelId ?? undefined,
                providerId: selectedProviderId ?? undefined,
            };
            isWaitingForCompletion.value = true;
            return;
        }

        const selectedModelId = modelOverride.value.modelId;
        const selectedProviderId = modelOverride.value.providerId;
        const supportedAttachments = getSupportedAttachments();

        clearDraft({ preserveModelTag: true });

        await sendRequest(
            query,
            supportedAttachments,
            selectedModelId ?? undefined,
            selectedProviderId ?? undefined
        );
    }

    function clearAll() {
        clearConversation();
        clearDraft();
    }

    function cancelRequest() {
        if (isLoading.value) {
            cancel();
        }
    }

    async function handleRegenerateMessage(messageId: string) {
        const messageIndex = conversationHistory.value.findIndex(
            (message) => message.id === messageId
        );
        if (messageIndex <= 0) {
            return;
        }

        const userMessage = conversationHistory.value[messageIndex - 1];
        if (!userMessage || userMessage.role !== 'user') {
            return;
        }

        const selectedModelId = modelOverride.value.modelId;
        const selectedProviderId = modelOverride.value.providerId;
        const supportedAttachments = (userMessage.attachments || []).filter(isAttachmentSupported);

        await sendRequest(
            userMessage.content,
            supportedAttachments,
            selectedModelId ?? undefined,
            selectedProviderId ?? undefined
        );
    }

    return {
        pendingRequest,
        isWaitingForCompletion,
        isLoading,
        error,
        conversationHistory: conversationHistory as Ref<ConversationMessage[]>,
        clearConversation,
        handleSubmit,
        clearAll,
        cancelRequest,
        handleRegenerateMessage,
    };
}
