<script setup lang="ts">
    // Copyright (c) 2025. Qian Cheng. Licensed under GPL v3.

    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

    import ResponseDisplay from '@/components/ResponseDisplay.vue';
    import SearchBar from '@/components/SearchBar.vue';
    import { useAiRequest } from '@/composables/useAiRequest';
    import { useWindowResize } from '@/composables/useWindowResize';

    const searchQuery = ref('');
    const searchBar = ref<InstanceType<typeof SearchBar>>();
    const responseDisplay = ref<InstanceType<typeof ResponseDisplay>>();
    const pageContainer = ref<HTMLElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;

    // 双击退格检测（仅用于取消请求）
    const lastBackspacePressTime = ref(0);
    const DOUBLE_PRESS_THRESHOLD = 150; // 150ms 内算双击

    const { isLoading, error, response, reasoning, hasResponse, sendRequest, reset, cancel } =
        useAiRequest();

    const { resizeForResponse } = useWindowResize();

    document.oncontextmenu = function () {
        return false;
    };

    function handleSearch(query: string) {
        searchQuery.value = query;
    }

    async function handleSubmit(query: string) {
        reset();
        await sendRequest(query);
    }

    // 处理清空事件（点击清除按钮）
    function handleClear() {
        searchQuery.value = '';
        reset();
    }

    // 清空输入框和回复
    function clearAll() {
        searchQuery.value = '';
        reset();
        searchBar.value?.clearInput();
    }

    // 取消当前请求
    function cancelRequest() {
        if (isLoading.value) {
            cancel();
        }
    }

    // 全局键盘事件监听
    async function handleKeyDown(event: KeyboardEvent) {
        const now = Date.now();

        // Tab 键切换焦点到响应模块
        if (event.key === 'Tab' && hasResponse.value) {
            event.preventDefault();
            responseDisplay.value?.focus();
            return;
        }

        // ESC 键处理
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();

            // 如果没有输入内容，隐藏窗口
            if (!searchQuery.value.trim() && !hasResponse.value) {
                try {
                    const appWindow = getCurrentWindow();
                    await appWindow.hide();
                } catch (error) {
                    console.error('[SearchView] Failed to hide window:', error);
                }
                return;
            }

            // 如果有内容
            if (isLoading.value) {
                // 正在请求中，取消请求但不清空输出内容
                cancelRequest();
            } else {
                // 不在请求中，清空内容
                clearAll();
            }
            return;
        }

        // 双击退格键取消请求
        if (event.key === 'Backspace') {
            if (now - lastBackspacePressTime.value < DOUBLE_PRESS_THRESHOLD) {
                // 如果在加载中，取消请求
                if (isLoading.value) {
                    cancelRequest();
                }
                lastBackspacePressTime.value = 0; // 重置，避免三击触发
            } else {
                lastBackspacePressTime.value = now;
            }
        }
    }

    onMounted(async () => {
        await nextTick();
        if (searchBar.value) {
            await searchBar.value.focus();
        }

        const appWindow = getCurrentWindow();

        await appWindow.listen('tauri://focus', async () => {
            await nextTick();
            searchBar.value?.focus();
        });

        // 监听整个页面容器的高度变化
        if (pageContainer.value) {
            resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.clientHeight;
                    resizeForResponse(height).catch((error) => {
                        console.error('[SearchView] Failed to resize window:', error);
                    });
                }
            });

            resizeObserver.observe(pageContainer.value);

            // 初始触发一次
            await nextTick(() => {
                if (pageContainer.value) {
                    resizeForResponse(pageContainer.value.clientHeight).catch((error) => {
                        console.error('[SearchView] Failed to resize window:', error);
                    });
                }
            });
        }

        // 添加全局键盘事件监听
        window.addEventListener('keydown', handleKeyDown);
    });

    onBeforeUnmount(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        // 移除键盘事件监听
        window.removeEventListener('keydown', handleKeyDown);
    });
</script>

<template>
    <div
        ref="pageContainer"
        class="flex w-screen flex-col items-center justify-start bg-transparent"
    >
        <SearchBar
            ref="searchBar"
            :disabled="isLoading"
            @search="handleSearch"
            @submit="handleSubmit"
            @clear="handleClear"
        />
        <ResponseDisplay
            v-if="hasResponse || isLoading"
            ref="responseDisplay"
            :content="response"
            :reasoning="reasoning"
            :is-loading="isLoading"
            :error="error"
        />
    </div>
</template>
