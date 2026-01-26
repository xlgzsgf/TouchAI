// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { onMounted, onUnmounted } from 'vue';

const MAX_HEIGHT = 700;

/**
 * 全局窗口自动调整 composable
 * 监听 DOM 内容变化，自动调整窗口大小以适应内容
 * 只在主窗口（label="main"）生效
 */
export function useAutoWindowResize() {
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let lastHeight = 0;
    let isMainWindow = false;

    async function adjustWindowSize(height: number) {
        // 只在主窗口调整大小
        if (!isMainWindow) {
            return;
        }

        // 限制最大高度
        const finalHeight = Math.min(Math.ceil(height), MAX_HEIGHT);

        // 只在高度变化超过 2px 时调整窗口
        if (Math.abs(finalHeight - lastHeight) < 2) {
            return;
        }

        console.log(`Adjusting window height from ${lastHeight} to ${finalHeight}`);
        lastHeight = finalHeight;

        try {
            await invoke('resize_window_for_response', { height: finalHeight });
        } catch (error) {
            console.error('Failed to resize window:', error);
        }
    }

    function checkAndAdjustSize() {
        const appElement = document.getElementById('app');
        if (!appElement) {
            return;
        }

        // 获取实际渲染高度
        const height = appElement.scrollHeight;
        adjustWindowSize(height);
    }

    async function startObserving() {
        // 检查当前窗口是否为主窗口
        const currentWindow = getCurrentWindow();
        isMainWindow = currentWindow.label === 'main';

        if (!isMainWindow) {
            console.log('Not main window, skipping auto-resize');
            return;
        }

        const appElement = document.getElementById('app');
        if (!appElement) {
            console.warn('App element not found');
            return;
        }

        // 使用 ResizeObserver 监听尺寸变化
        resizeObserver = new ResizeObserver(() => {
            checkAndAdjustSize();
        });
        resizeObserver.observe(appElement);

        // 使用 MutationObserver 监听 DOM 变化
        mutationObserver = new MutationObserver(() => {
            checkAndAdjustSize();
        });
        mutationObserver.observe(appElement, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });

        // 初始调整
        setTimeout(() => {
            checkAndAdjustSize();
        }, 100);
    }

    function stopObserving() {
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }
    }

    onMounted(() => {
        startObserving();
    });

    onUnmounted(() => {
        stopObserving();
    });

    return {
        startObserving,
        stopObserving,
    };
}
