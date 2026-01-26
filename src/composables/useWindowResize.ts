// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { invoke } from '@tauri-apps/api/core';
import { ref } from 'vue';

const SEARCH_BAR_HEIGHT = 60;
const MAX_RESPONSE_HEIGHT = 600;
const PADDING = 40;

export function useWindowResize() {
    const currentHeight = ref(SEARCH_BAR_HEIGHT);

    async function resizeForResponse(contentHeight: number) {
        // 计算新高度：SearchBar + Response + Padding
        const newHeight = Math.min(
            SEARCH_BAR_HEIGHT + contentHeight + PADDING,
            SEARCH_BAR_HEIGHT + MAX_RESPONSE_HEIGHT + PADDING
        );

        if (newHeight !== currentHeight.value) {
            await invoke('resize_window_for_response', { height: newHeight });
            currentHeight.value = newHeight;
        }
    }

    async function resetToSearchBar() {
        await invoke('resize_window_for_response', { height: SEARCH_BAR_HEIGHT });
        currentHeight.value = SEARCH_BAR_HEIGHT;
    }

    return {
        currentHeight,
        resizeForResponse,
        resetToSearchBar,
    };
}
