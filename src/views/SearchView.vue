<script setup lang="ts">
    // Copyright (c) 2025. Qian Cheng. Licensed under GPL v3.

    import { invoke } from '@tauri-apps/api/core';
    import { getCurrentWindow } from '@tauri-apps/api/window';
    import { nextTick, onMounted, ref } from 'vue';

    import ResponseDisplay from '@/components/ResponseDisplay.vue';
    import SearchBar from '@/components/SearchBar.vue';
    import { useAiRequest } from '@/composables/useAiRequest';

    const searchQuery = ref('');
    const searchBar = ref<InstanceType<typeof SearchBar>>();

    const { isLoading, error, response, hasResponse, sendRequest, reset } = useAiRequest({
        onChunk: () => {
            // 内容更新时会触发 ResponseDisplay 的 heightChange 事件
        },
    });

    document.oncontextmenu = function () {
        return false;
    };

    function handleSearch(query: string) {
        searchQuery.value = query;
    }

    async function handleSubmit(query: string) {
        console.debug('Submitting query:', query);

        // 立即将窗口调整为最大高度
        try {
            await invoke('resize_window_for_response', { height: 700 });
        } catch (error) {
            console.error('[SearchView] Failed to resize window:', error);
        }

        reset();
        await sendRequest(query);
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
    });
</script>

<template>
    <div class="flex w-screen flex-col items-center justify-start bg-transparent select-none">
        <SearchBar ref="searchBar" @search="handleSearch" @submit="handleSubmit" />
        <ResponseDisplay
            v-if="hasResponse || isLoading"
            :content="response"
            :is-loading="isLoading"
            :error="error"
        />
    </div>
</template>
