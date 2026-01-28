// Copyright (c) 2025. 千诚. Licensed under GPL v3

import type { ComponentPublicInstance } from 'vue';
import { createApp } from 'vue';

import AlertMessage from '@/components/AlertMessage.vue';

interface AlertInstance {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

let alertInstance: ComponentPublicInstance<AlertInstance> | null = null;
let containerElement: HTMLDivElement | null = null;

const initAlertSystem = () => {
    if (alertInstance) return alertInstance;

    // 创建容器元素
    containerElement = document.createElement('div');
    containerElement.id = 'alert-container';
    document.body.appendChild(containerElement);

    // 创建 Vue 应用实例
    const app = createApp(AlertMessage);
    alertInstance = app.mount(containerElement) as ComponentPublicInstance<AlertInstance>;

    return alertInstance;
};

export const useAlert = () => {
    if (!alertInstance) {
        initAlertSystem();
    }

    return {
        success: (message: string, duration?: number) => alertInstance!.success(message, duration),
        error: (message: string, duration?: number) => alertInstance!.error(message, duration),
        warning: (message: string, duration?: number) => alertInstance!.warning(message, duration),
        info: (message: string, duration?: number) => alertInstance!.info(message, duration),
    };
};

// 清理函数（可选，用于应用卸载时）
export const destroyAlertSystem = () => {
    if (containerElement && containerElement.parentNode) {
        containerElement.parentNode.removeChild(containerElement);
        containerElement = null;
        alertInstance = null;
    }
};
