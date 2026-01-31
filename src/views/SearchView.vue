<script setup lang="ts">
    // Copyright (c) 2025. Qian Cheng. Licensed under GPL v3.

    import ResponsePanel from '@components/search/ResponsePanel.vue';
    import SearchBar from '@components/search/SearchBar.vue';
    import { useAiRequest } from '@composables/useAiRequest';
    import { useWindowResize } from '@composables/useWindowResize';
    import { invoke } from '@tauri-apps/api/core';
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { nextTick, onMounted, onUnmounted, ref } from 'vue';

    const searchQuery = ref('');
    const searchBar = ref<InstanceType<typeof SearchBar>>();
    const responseDisplay = ref<InstanceType<typeof ResponsePanel>>();
    const pageContainer = ref<HTMLElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;
    let unlistenFocus: (() => void) | null = null;
    let unlistenBlur: (() => void) | null = null;

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

        const selectedModelId = searchBar.value?.selectedModelId;
        const selectedProviderId = searchBar.value?.selectedProviderId;

        await sendRequest(query, selectedModelId || undefined, selectedProviderId || undefined);
    }

    // 处理清空事件（点击清除按钮）
    function handleClear() {
        searchQuery.value = '';
        reset();
    }

    // 处理下拉框状态变化
    async function handleDropdownStateChange(isOpen: boolean) {
        if (isOpen) {
            // 下拉框打开时，扩展窗口高度以容纳下拉框
            // 搜索框高度 + 下拉框最大高度 + 间距
            await resizeForResponse(56 + 384 + 40); // 56px searchbar + 384px dropdown (max-h-96) + 40px padding
        } else {
            // 下拉框关闭时，恢复原始高度
            if (!hasResponse.value) {
                await resizeForResponse(56 + 40); // 只有搜索框
            }
        }
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

    // 键盘事件监听
    async function handleKeyDown(event: KeyboardEvent) {
        const now = Date.now();
        console.log('[handleKeyDown] Key pressed:', event.key);

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

            // 优先级1: 如果下拉框打开，关闭下拉框
            if (searchBar.value?.isModelDropdownOpen) {
                searchBar.value?.closeModelDropdown();
                return;
            }

            // 优先级2: 如果正在加载，取消请求
            if (isLoading.value) {
                cancelRequest();
                return;
            }

            // 优先级3: 如果输入为空且有选择模型，取消选择模型
            const hasSelectedModel = searchBar.value?.selectedModelId;
            if (!searchQuery.value.trim() && hasSelectedModel) {
                searchBar.value?.clearSelectedModel();
                return;
            }

            // 优先级4: 如果没有输入内容并且也没有结果，即空窗口，那么隐藏窗口
            if (!searchQuery.value.trim() && !hasResponse.value) {
                await getCurrentWindow().hide();
                return;
            }

            // 优先级5: 其他情况，清空内容
            clearAll();
            return;
        }

        // @ 键打开模型下拉框
        if (event.key === '@' && !searchBar.value?.isModelDropdownOpen) {
            event.preventDefault();
            searchBar.value?.openModelDropdown();
            return;
        }

        // 如果下拉框打开，处理相关按键
        if (searchBar.value?.isModelDropdownOpen) {
            // 箭头键和 Enter 键交给下拉框处理
            if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
                event.preventDefault();
                searchBar.value?.handleDropdownKeyDown(event);
                return;
            }
            // 其他可输入字符，确保焦点在输入框上
            if (event.key.length === 1 || event.key === 'Backspace') {
                searchBar.value?.focus();
            }
        }

        // Backspace 键处理
        if (event.key === 'Backspace') {
            // 如果下拉框打开，关闭下拉框
            if (searchBar.value?.isModelDropdownOpen) {
                searchBar.value?.closeModelDropdown();
                return;
            }

            // 如果输入框为空且有选择的模型，删除模型选择
            if (!searchQuery.value && searchBar.value?.selectedModelId) {
                event.preventDefault();
                searchBar.value?.clearSelectedModel();
                return;
            }

            // 双击退格键取消请求
            if (now - lastBackspacePressTime.value < DOUBLE_PRESS_THRESHOLD) {
                if (isLoading.value) {
                    cancelRequest();
                }
                lastBackspacePressTime.value = 0;
            } else {
                lastBackspacePressTime.value = now;
            }
        }

        // Enter 键提交查询
        if (event.key === 'Enter') {
            event.preventDefault();
            if (!isLoading.value && searchQuery.value.trim()) {
                await handleSubmit(searchQuery.value);
            }
        }
    }

    function initPageHeightChangeListener() {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.clientHeight;
                resizeForResponse(height).catch((error) => {
                    console.error('[SearchView] Failed to resize window:', error);
                });
            }
        });

        resizeObserver.observe(pageContainer.value as HTMLElement);

        // 初始触发一次
        nextTick(() => {
            resizeForResponse((pageContainer.value as HTMLElement).clientHeight).catch((error) => {
                console.error('[SearchView] Failed to resize window:', error);
            });
        });
    }

    async function initFocusListener() {
        unlistenFocus = await getCurrentWindow().listen('tauri://focus', async () => {
            await nextTick();
            searchBar.value?.focus();
        });

        unlistenBlur = await getCurrentWindow().listen('tauri://blur', async () => {
            await invoke('hide_search_window');
        });
    }

    onMounted(async () => {
        // 初始化窗口获得焦点监听
        await initFocusListener();

        // 监听整个页面容器的高度变化
        initPageHeightChangeListener();

        // 添加全局键盘事件监听
        window.addEventListener('keydown', handleKeyDown);
    });

    onUnmounted(() => {
        // 清理全局键盘事件监听
        window.removeEventListener('keydown', handleKeyDown);

        // 清理窗口焦点监听
        if (unlistenFocus) {
            unlistenFocus();
            unlistenFocus = null;
        }
        if (unlistenBlur) {
            unlistenBlur();
            unlistenBlur = null;
        }

        // 清理 ResizeObserver
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
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
            :is-loading="isLoading"
            @search="handleSearch"
            @submit="handleSubmit"
            @clear="handleClear"
            @dropdown-state-change="handleDropdownStateChange"
        />
        <ResponsePanel
            v-if="hasResponse"
            ref="responseDisplay"
            :content="response"
            :reasoning="reasoning"
            :is-loading="isLoading"
            :error="error"
        />
    </div>
</template>
