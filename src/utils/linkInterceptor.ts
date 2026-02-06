// Copyright (c) 2025. 千诚. Licensed under GPL v3.

/**
 * 链接拦截器
 * 内部链接在应用内导航，外部链接使用系统默认浏览器打开
 */

import { openUrl } from '@tauri-apps/plugin-opener';

import router from '@/router';

/**
 * 检查 URL 是否为内部链接
 * @param url 要检查的 URL
 */
function isInternalLink(url: string): boolean {
    // 空链接或锚点链接
    if (!url || url === '#' || url.startsWith('#')) {
        return true;
    }

    // 相对路径（不以协议开头）
    if (!url.includes('://') && !url.startsWith('//')) {
        return true;
    }

    // 检查是否为本地开发服务器或 Tauri 协议
    const currentOrigin = window.location.origin;
    try {
        const linkUrl = new URL(url, currentOrigin);
        return (
            linkUrl.origin === currentOrigin ||
            linkUrl.protocol === 'tauri:' ||
            linkUrl.protocol === 'asset:'
        );
    } catch {
        return false;
    }
}

/**
 * 处理链接点击事件
 * @param event 点击事件
 */
function handleLinkClick(event: MouseEvent): void {
    // 查找被点击的链接元素
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');

    if (!anchor) {
        return;
    }

    const href = anchor.getAttribute('href');

    // 如果没有 href，不处理
    if (!href) {
        return;
    }

    // 检查是否为内部链接
    if (isInternalLink(href)) {
        // 如果是相对路径且不是锚点，使用 Vue Router 导航
        if (href.startsWith('/') && !href.startsWith('//')) {
            event.preventDefault();
            router.push(href);
        }
        // 锚点链接允许默认行为
        return;
    }

    // 外部链接：阻止默认行为，使用外部浏览器打开
    event.preventDefault();
    event.stopPropagation();

    openUrl(href).then(() => {});
}

/**
 * 拦截 window.open，外部链接使用系统浏览器打开
 */
function interceptWindowOpen(): void {
    const originalOpen = window.open;

    window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
        const urlString = url?.toString() || '';

        if (!isInternalLink(urlString)) {
            // 外部链接使用系统浏览器打开
            openUrl(urlString).then(() => {});
            return null;
        }

        return originalOpen.call(window, url, target, features);
    };
}

/**
 * 初始化链接拦截器
 * 应在应用启动时调用
 */
export function setupLinkInterceptor(): void {
    // 监听全局点击事件（捕获阶段，确保最先处理）
    document.addEventListener('click', handleLinkClick, true);

    // 拦截 window.open
    interceptWindowOpen();
}
