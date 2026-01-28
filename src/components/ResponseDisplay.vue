<template>
    <div class="relative w-full">
        <div
            ref="responseContainer"
            tabindex="0"
            class="response-container custom-scrollbar bg-background-primary mt-2 w-full overflow-y-auto rounded-lg border border-gray-300 px-10 py-5 shadow-lg backdrop-blur-xl"
            :style="{ maxHeight: `${maxHeight}px` }"
            @scroll="handleScroll"
        >
            <div
                v-if="isLoading && !content && !reasoning"
                class="flex w-full items-center gap-2 p-4 text-gray-500"
            >
                <div
                    class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
                ></div>
                <span>Thinking...</span>
            </div>

            <div
                v-if="reasoning || isThinking"
                class="reasoning-section mt-4 mb-4 w-full rounded-lg border border-gray-300 bg-gray-100/80 shadow-sm"
            >
                <button
                    class="sticky top-0 z-10 flex w-full items-center gap-2 rounded-t-lg border-b border-gray-300 bg-gray-200/90 px-3 py-2 text-left text-xs font-medium text-gray-600 backdrop-blur-sm transition-colors hover:bg-gray-300/90"
                    @click="toggleReasoning"
                >
                    <svg
                        class="h-3.5 w-3.5 transition-transform"
                        :class="{ 'rotate-90': isReasoningExpanded }"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                    <span v-if="isThinking">思考中</span>
                    <span v-else>已完成思考（用时 {{ reasoningDuration }}秒）</span>
                    <span
                        v-if="isThinking"
                        class="ml-auto flex items-center gap-1 text-xs text-gray-500"
                    >
                        <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500"></div>
                    </span>
                </button>
                <div
                    v-show="isReasoningExpanded"
                    ref="reasoningContainer"
                    class="reasoning-content custom-scrollbar-thin max-h-60 w-full overflow-y-auto rounded-b-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600"
                    @scroll="handleReasoningScroll"
                >
                    <div class="prose prose-xs max-w-none" v-html="renderedReasoning"></div>
                </div>
            </div>

            <div
                v-if="content"
                class="markdown-content prose prose-sm response-text max-w-none select-text"
                :class="{ 'pt-4': !reasoning && !isThinking }"
                v-html="renderedContent"
            ></div>

            <div v-if="error" class="p-4 text-sm text-red-600">
                <span class="font-semibold">Error:</span>
                {{ error.message }}
            </div>
        </div>

        <div
            v-if="showScrollToBottom"
            class="pointer-events-none absolute right-0 bottom-0 left-0 flex h-20 items-end justify-center rounded-lg pb-4"
            style="
                background: linear-gradient(
                    to bottom,
                    transparent 0%,
                    rgba(255, 255, 255, 0.95) 100%
                );
            "
        >
            <button
                class="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl"
                @click="scrollToBottom"
            >
                <svg
                    class="h-5 w-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

    import { renderMarkdown } from '@/utils/markdown';

    interface Props {
        content: string;
        reasoning?: string; // 推理内容
        isLoading: boolean;
        error: Error | null;
        maxHeight?: number;
    }

    const props = withDefaults(defineProps<Props>(), {
        maxHeight: 600,
        reasoning: '',
    });

    const emit = defineEmits<{
        heightChange: [height: number];
    }>();

    const responseContainer = ref<HTMLElement | null>(null);
    const reasoningContainer = ref<HTMLElement | null>(null);
    const isReasoningExpanded = ref(true); // 默认展开
    const isThinking = computed(() => props.isLoading && props.reasoning && !props.content);
    const reasoningStartTime = ref<number | null>(null);
    const reasoningDuration = ref(0);
    const showScrollToBottom = ref(false);
    const isAutoScrollEnabled = ref(true);
    const isReasoningAutoScrollEnabled = ref(true);
    let resizeObserver: ResizeObserver | null = null;

    // 暴露 focus 方法
    function focus() {
        responseContainer.value?.focus();
    }

    defineExpose({
        focus,
    });

    // 渲染 markdown
    const renderedContent = computed(() => {
        if (!props.content) return '';
        return renderMarkdown(props.content);
    });

    const renderedReasoning = computed(() => {
        if (!props.reasoning) return '';
        return renderMarkdown(props.reasoning);
    });

    // 处理代码复制按钮点击
    function handleCopyClick(event: Event) {
        const target = event.target as HTMLElement;
        const button = target.closest('.code-copy-btn') as HTMLButtonElement;
        if (!button) return;

        const code = button.getAttribute('data-code');
        if (!code) return;

        // 解码 HTML 实体
        const textarea = document.createElement('textarea');
        textarea.innerHTML = code;
        const decodedCode = textarea.value;

        // 复制到剪贴板
        navigator.clipboard.writeText(decodedCode).then(() => {
            const copyText = button.querySelector('.copy-text');
            if (copyText) {
                const originalText = copyText.textContent;
                copyText.textContent = '已复制';
                setTimeout(() => {
                    copyText.textContent = originalText;
                }, 2000);
            }
        });
    }

    // 切换 reasoning 展开/收缩
    function toggleReasoning() {
        isReasoningExpanded.value = !isReasoningExpanded.value;
    }

    // 检查是否滚动到底部
    function isScrolledToBottom(container: HTMLElement | null): boolean {
        if (!container) return true;
        const { scrollTop, scrollHeight, clientHeight } = container;
        // 允许 5px 的误差
        return scrollHeight - scrollTop - clientHeight < 5;
    }

    // 检查内容是否超出容器（是否有滚动条）
    function hasScrollbar(): boolean {
        if (!responseContainer.value) return false;
        const { scrollHeight, clientHeight } = responseContainer.value;
        return scrollHeight > clientHeight;
    }

    // 处理主容器滚动事件
    function handleScroll() {
        if (!responseContainer.value) return;

        const atBottom = isScrolledToBottom(responseContainer.value);

        // 如果用户滚动到底部，恢复自动滚动并隐藏按钮
        if (atBottom) {
            isAutoScrollEnabled.value = true;
            showScrollToBottom.value = false;
        } else {
            // 如果用户向上滚动且内容超出容器，禁用自动滚动并显示按钮
            if (hasScrollbar()) {
                isAutoScrollEnabled.value = false;
                showScrollToBottom.value = true;
            }
        }
    }

    // 滚动到底部
    function scrollToBottom() {
        if (!responseContainer.value) return;
        responseContainer.value.scrollTop = responseContainer.value.scrollHeight;
        isAutoScrollEnabled.value = true;
        showScrollToBottom.value = false;
    }

    // 处理 reasoning 容器滚动事件
    function handleReasoningScroll() {
        if (!reasoningContainer.value) return;

        const atBottom = isScrolledToBottom(reasoningContainer.value);

        // 如果用户滚动到底部，恢复自动滚动
        if (atBottom) {
            isReasoningAutoScrollEnabled.value = true;
        } else {
            // 如果用户向上滚动，禁用自动滚动
            isReasoningAutoScrollEnabled.value = false;
        }
    }

    // 监听 reasoning 开始和结束，计算用时
    watch(
        () => props.reasoning,
        (newReasoning) => {
            if (newReasoning && !reasoningStartTime.value) {
                // reasoning 开始
                reasoningStartTime.value = Date.now();
            }
        }
    );

    // 当 content 开始出现时，自动收缩 reasoning 并计算用时
    watch(
        () => props.content,
        (newContent, oldContent) => {
            // 内容被清空时（新请求开始前），重置自动滚动状态
            if (!newContent && oldContent) {
                isAutoScrollEnabled.value = true;
                isReasoningAutoScrollEnabled.value = true;
                showScrollToBottom.value = false;
            }

            // 新请求开始时（从无内容到有内容），确保自动滚动已启用
            if (newContent && !oldContent) {
                isAutoScrollEnabled.value = true;
                showScrollToBottom.value = false;

                if (props.reasoning) {
                    // content 开始出现，reasoning 完成
                    if (reasoningStartTime.value) {
                        const duration = (Date.now() - reasoningStartTime.value) / 1000;
                        reasoningDuration.value = Math.round(duration * 10) / 10; // 保留1位小数
                    }
                    isReasoningExpanded.value = false;
                }
            }
        }
    );

    // 自动滚动主容器到底部（仅在启用自动滚动时）
    watch(
        () => props.content,
        async () => {
            if (!isAutoScrollEnabled.value) return;

            await nextTick();
            if (responseContainer.value) {
                responseContainer.value.scrollTop = responseContainer.value.scrollHeight;
            }
        }
    );

    // 自动滚动 reasoning 容器到底部（仅在启用自动滚动时）
    watch(
        () => props.reasoning,
        async () => {
            if (!isReasoningAutoScrollEnabled.value || !isReasoningExpanded.value) return;

            await nextTick();
            if (reasoningContainer.value) {
                reasoningContainer.value.scrollTop = reasoningContainer.value.scrollHeight;
            }
        }
    );

    // 使用 ResizeObserver 实时监听容器高度变化
    onMounted(() => {
        if (responseContainer.value) {
            resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    // 使用 borderBoxSize 获取更精确的尺寸
                    const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.clientHeight;
                    emit('heightChange', height);
                }
            });

            resizeObserver.observe(responseContainer.value);

            // 初始触发一次高度变化事件
            nextTick(() => {
                if (responseContainer.value) {
                    emit('heightChange', responseContainer.value.offsetHeight);
                }
            });

            // 添加代码复制按钮点击事件监听
            responseContainer.value.addEventListener('click', handleCopyClick);
        }
    });

    // 清理 ResizeObserver 和事件监听器
    onBeforeUnmount(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        if (responseContainer.value) {
            responseContainer.value.removeEventListener('click', handleCopyClick);
        }
    });
</script>

<style scoped>
    /* 移除焦点时的默认边框 */
    .response-container:focus {
        outline: none;
    }

    .response-text {
        font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Source Serif Pro', 'Georgia', serif;
        font-size: 15px;
        line-height: 1.8;
        letter-spacing: 0.02em;
        color: var(--color-text-secondary);
    }

    .response-text :deep(h1),
    .response-text :deep(h2),
    .response-text :deep(h3),
    .response-text :deep(h4),
    .response-text :deep(h5),
    .response-text :deep(h6) {
        font-family:
            'Source Han Sans SC',
            'Noto Sans SC',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
        font-weight: 600;
        margin-top: 1.5em;
        margin-bottom: 0.75em;
        color: var(--color-text-primary);
    }

    .response-text :deep(code) {
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
        font-size: 0.9em;
        background-color: var(--color-code-bg);
        padding: 0.2em 0.4em;
        border-radius: 3px;
        color: var(--color-code-text);
    }

    .response-text :deep(pre) {
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
        background-color: var(--color-code-block-bg);
        color: var(--color-code-block-text);
        padding: 1em;
        border-radius: 6px;
        overflow-x: auto;
        line-height: 1.6;
    }

    .response-text :deep(pre code) {
        background-color: transparent;
        color: inherit;
        padding: 0;
    }

    .response-text :deep(p) {
        margin-bottom: 1em;
    }

    .response-text :deep(strong) {
        font-weight: 600;
        color: var(--color-text-primary);
    }

    .response-text :deep(a) {
        color: var(--color-link);
        text-decoration: none;
        border-bottom: 1px solid #dbeafe; /* primary-100 */
        transition: all 0.2s;
    }

    .response-text :deep(a:hover) {
        color: var(--color-link-hover);
        border-bottom-color: var(--color-link);
    }

    .response-text :deep(blockquote) {
        border-left: 4px solid var(--color-border-primary);
        padding-left: 1em;
        margin-left: 0;
        color: var(--color-text-secondary);
        font-style: italic;
    }

    .response-text :deep(ul),
    .response-text :deep(ol) {
        padding-left: 1.5em;
        margin-bottom: 1em;
    }

    .response-text :deep(li) {
        margin-bottom: 0.5em;
    }

    /* Reasoning 内容样式 */
    .reasoning-content {
        font-family: 'Source Han Serif SC', 'Noto Serif SC', 'Source Serif Pro', 'Georgia', serif;
        line-height: 2;
    }
</style>
