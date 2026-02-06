// Copyright (c) 2025. 千诚. Licensed under GPL v3.

import '@styles/tailwind.css';

import { useAlert } from '@composables/useAlert';
import { db } from '@database';
import { getSettingValue, setSetting } from '@database/queries';
import { popupManager } from '@services/popup';
import { invoke } from '@tauri-apps/api/core';
import { setupLinkInterceptor } from '@utils/linkInterceptor';
import { createApp } from 'vue';

import App from './App.vue';
import router from './router';

const DEFAULT_GLOBAL_SHORTCUT = 'Alt+Space';

/**
 * 初始化全局快捷键
 */
async function initializeGlobalShortcut() {
    try {
        const storedShortcut = await getSettingValue('global_shortcut');
        const shortcut = storedShortcut || DEFAULT_GLOBAL_SHORTCUT;

        if (!storedShortcut) {
            await setSetting('global_shortcut', DEFAULT_GLOBAL_SHORTCUT, '全局快捷键');
        }

        await invoke('register_global_shortcut', { shortcut });
    } catch (error) {
        console.error('Failed to initialize global shortcut:', error);
    }
}

/**
 * 初始化应用
 */
async function initializeApp() {
    // 1. 初始化数据库连接，数据库连接为必须，因此阻塞等待
    await db.init();

    // 2. 初始化全局快捷键
    initializeGlobalShortcut().catch(console.error);

    // 3. 初始化 Alert 系统
    useAlert();

    // 4. 启用链接拦截器（禁止外部链接跳转）
    setupLinkInterceptor();

    // 5. 初始化Popup
    popupManager.initialize().catch(console.error);

    // 6. 创建并挂载 Vue 应用
    const app = createApp(App);
    app.use(router);
    app.mount('#app');
}

// 运行应用初始化
initializeApp().catch(console.error);
