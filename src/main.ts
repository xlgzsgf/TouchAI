// Copyright (c) 2025. 千诚. Licensed under GPL v3.

import '@styles/tailwind.css';

import { setupLinkInterceptor } from '@utils/linkInterceptor';
import { createApp } from 'vue';

import { useAlert } from '@/composables/useAlert';
import { db } from '@/database';

import App from './App.vue';
import router from './router';

/**
 * 初始化应用
 */
async function initializeApp() {
    // 1. 初始化数据库连接
    await db.init();

    // 2. 初始化 Alert 系统
    useAlert();

    // 3. 启用链接拦截器（禁止外部链接跳转）
    setupLinkInterceptor();

    // 4. 创建并挂载 Vue 应用
    const app = createApp(App);
    app.use(router);
    app.mount('#app');
}

// 运行应用初始化
initializeApp().catch(console.error);
