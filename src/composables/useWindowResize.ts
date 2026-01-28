// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { invoke } from '@tauri-apps/api/core';
import { ref } from 'vue';

const MAX_WINDOW_HEIGHT = 700;

export function useWindowResize() {
    const currentHeight = ref(0);

    async function resizeForResponse(pageHeight: number) {
        // 直接使用页面高度，限制最大高度，并向上取整为整数
        const newHeight = Math.ceil(Math.min(pageHeight, MAX_WINDOW_HEIGHT));

        if (newHeight !== currentHeight.value) {
            await invoke('resize_window_for_response', { height: newHeight });
            currentHeight.value = newHeight;
        }
    }

    async function resetToSearchBar() {
        const SEARCH_BAR_HEIGHT = 60;
        await invoke('resize_window_for_response', { height: SEARCH_BAR_HEIGHT });
        currentHeight.value = SEARCH_BAR_HEIGHT;
    }

    return {
        currentHeight,
        resizeForResponse,
        resetToSearchBar,
    };
}
