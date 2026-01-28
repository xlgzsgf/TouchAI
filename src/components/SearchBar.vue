<template>
    <div class="mx-auto h-[56px] w-full select-none" @click="focus">
        <div
            class="bg-background-primary relative flex h-full items-center gap-5 rounded-lg border border-gray-300 p-3 backdrop-blur-sm backdrop-blur-xl transition-all duration-250 ease-in-out"
        >
            <div class="flex items-center justify-center">
                <img src="@assets/logo_word.svg" alt="search" class="h-5 w-15 select-none" />
            </div>
            <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                autofocus
                :readonly="disabled"
                :placeholder="placeholder"
                :class="[
                    'flex-1 cursor-default border-0 bg-transparent font-sans text-lg caret-gray-500 outline-none placeholder:text-gray-400 placeholder:select-none',
                    disabled ? 'text-gray-400' : 'text-gray-900',
                ]"
                @input="onSearch"
                @keydown.enter="onEnter"
            />
            <div
                v-if="searchQuery"
                class="ml-2 flex cursor-pointer items-center text-gray-400 transition-colors duration-200 hover:text-gray-600"
                data-tauri-drag-region="false"
                @click="clearSearch"
            >
                <img src="@assets/icons/clear.svg" alt="clear" class="h-5 w-5" />
            </div>
            <div
                class="ml-2 flex cursor-pointer items-center text-gray-400 transition-colors duration-200 hover:text-gray-600"
                data-tauri-drag-region="false"
                title="设置"
                @click="openSettings"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    // Copyright (c) 2025. 千诚. Licensed under GPL v3.

    import { invoke } from '@tauri-apps/api/core';
    import { ref } from 'vue';

    interface Props {
        disabled?: boolean;
    }

    const props = withDefaults(defineProps<Props>(), {
        disabled: false,
    });

    const placeholder = '写下你的需求...';

    const searchQuery = ref('');
    const searchInput = ref<HTMLInputElement | null>(null);

    const emit = defineEmits<{
        search: [query: string];
        submit: [query: string];
        clear: [];
    }>();

    function onSearch() {
        emit('search', searchQuery.value);
    }

    function onEnter() {
        // 如果禁用状态或输入为空，不处理
        if (props.disabled || !searchQuery.value.trim()) {
            return;
        }

        // 普通查询
        emit('submit', searchQuery.value);
    }

    function clearSearch() {
        searchQuery.value = '';
        emit('clear');
    }

    function clearInput() {
        searchQuery.value = '';
    }

    async function focus() {
        searchInput?.value?.focus();
    }

    async function openSettings() {
        try {
            await invoke('open_settings_window');
        } catch (error) {
            console.error('Failed to open settings window:', error);
        }
    }

    defineExpose({
        focus,
        clearInput,
    });
</script>

<style scoped></style>
