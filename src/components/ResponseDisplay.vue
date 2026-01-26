<template>
    <div
        ref="responseContainer"
        class="mt-2 w-full overflow-y-auto rounded-lg bg-white/95 p-4 shadow-lg backdrop-blur-sm"
        :style="{ maxHeight: `${maxHeight}px` }"
    >
        <!-- Loading State -->
        <div v-if="isLoading && !content" class="flex items-center gap-2 text-gray-500">
            <div
                class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
            ></div>
            <span>Thinking...</span>
        </div>

        <!-- Streaming Content with Markdown -->
        <div v-else-if="content" class="prose prose-sm max-w-none">
            <div class="markdown-content text-gray-800" v-html="renderedContent"></div>
            <div v-if="isLoading" class="ml-1 inline-block h-4 w-2 animate-pulse bg-gray-400"></div>
        </div>

        <!-- Error State -->
        <div v-if="error" class="text-sm text-red-600">
            <span class="font-semibold">Error:</span>
            {{ error.message }}
        </div>
    </div>
</template>

<script setup lang="ts">
    import { marked } from 'marked';
    import { computed, nextTick, ref, watch } from 'vue';

    interface Props {
        content: string;
        isLoading: boolean;
        error: Error | null;
        maxHeight?: number;
    }

    const props = withDefaults(defineProps<Props>(), {
        maxHeight: 600,
    });

    const emit = defineEmits<{
        heightChange: [height: number];
    }>();

    const responseContainer = ref<HTMLElement | null>(null);

    // 配置 marked
    marked.setOptions({
        breaks: true,
        gfm: true,
    });

    // 渲染 markdown
    const renderedContent = computed(() => {
        if (!props.content) return '';
        return marked.parse(props.content) as string;
    });

    // 自动滚动到底部并发出高度变化事件
    watch(
        () => props.content,
        async () => {
            await nextTick();
            if (responseContainer.value) {
                responseContainer.value.scrollTop = responseContainer.value.scrollHeight;

                // 发出高度变化事件 - 使用 offsetHeight 而不是 scrollHeight
                emit('heightChange', responseContainer.value.offsetHeight);
            }
        }
    );

    // 监听 loading 状态变化，确保初始显示时也触发高度计算
    watch(
        () => props.isLoading,
        async () => {
            await nextTick();
            if (responseContainer.value) {
                emit('heightChange', responseContainer.value.offsetHeight);
            }
        }
    );
</script>

<style scoped>
    .markdown-content :deep(h1),
    .markdown-content :deep(h2),
    .markdown-content :deep(h3),
    .markdown-content :deep(h4),
    .markdown-content :deep(h5),
    .markdown-content :deep(h6) {
        margin-top: 1em;
        margin-bottom: 0.5em;
        font-weight: 600;
        line-height: 1.25;
    }

    .markdown-content :deep(h1) {
        font-size: 1.5em;
    }

    .markdown-content :deep(h2) {
        font-size: 1.25em;
    }

    .markdown-content :deep(h3) {
        font-size: 1.1em;
    }

    .markdown-content :deep(p) {
        margin-bottom: 0.75em;
    }

    .markdown-content :deep(ul),
    .markdown-content :deep(ol) {
        margin-left: 1.5em;
        margin-bottom: 0.75em;
    }

    .markdown-content :deep(li) {
        margin-bottom: 0.25em;
    }

    .markdown-content :deep(code) {
        background-color: #f3f4f6;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-size: 0.875em;
        font-family: 'Courier New', monospace;
    }

    .markdown-content :deep(pre) {
        background-color: #1f2937;
        color: #f9fafb;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin-bottom: 0.75em;
    }

    .markdown-content :deep(pre code) {
        background-color: transparent;
        padding: 0;
        color: inherit;
    }

    .markdown-content :deep(blockquote) {
        border-left: 4px solid #d1d5db;
        padding-left: 1rem;
        margin-left: 0;
        margin-bottom: 0.75em;
        color: #6b7280;
    }

    .markdown-content :deep(a) {
        color: #3b82f6;
        text-decoration: underline;
    }

    .markdown-content :deep(a:hover) {
        color: #2563eb;
    }

    .markdown-content :deep(table) {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 0.75em;
    }

    .markdown-content :deep(th),
    .markdown-content :deep(td) {
        border: 1px solid #d1d5db;
        padding: 0.5rem;
        text-align: left;
    }

    .markdown-content :deep(th) {
        background-color: #f3f4f6;
        font-weight: 600;
    }

    .markdown-content :deep(hr) {
        border: none;
        border-top: 1px solid #d1d5db;
        margin: 1em 0;
    }
</style>
