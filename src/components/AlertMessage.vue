<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { ref, watch } from 'vue';

    export interface AlertProps {
        id: string;
        type: 'success' | 'error' | 'warning' | 'info';
        message: string;
        duration?: number;
    }

    const alerts = ref<AlertProps[]>([]);

    let nextId = 0;

    const show = (type: AlertProps['type'], message: string, duration: number = 3000): string => {
        const id = `alert-${nextId++}`;
        alerts.value.push({ id, type, message, duration });
        return id;
    };

    const close = (id: string) => {
        const index = alerts.value.findIndex((a) => a.id === id);
        if (index !== -1) {
            alerts.value.splice(index, 1);
        }
    };

    const success = (message: string, duration?: number) => show('success', message, duration);
    const error = (message: string, duration?: number) => show('error', message, duration);
    const warning = (message: string, duration?: number) => show('warning', message, duration);
    const info = (message: string, duration?: number) => show('info', message, duration);

    defineExpose({
        show,
        close,
        success,
        error,
        warning,
        info,
    });

    // 单个 Alert 项组件逻辑
    const getAlertClasses = (alert: AlertProps) => {
        const bgColor = (() => {
            switch (alert.type) {
                case 'success':
                    return 'bg-success-50 border-success-500';
                case 'error':
                    return 'bg-error-50 border-error-500';
                case 'warning':
                    return 'bg-warning-50 border-warning-500';
                case 'info':
                    return 'bg-info-50 border-info-500';
                default:
                    return 'bg-info-50 border-info-500';
            }
        })();

        const textColor = (() => {
            switch (alert.type) {
                case 'success':
                    return 'text-success-800';
                case 'error':
                    return 'text-error-800';
                case 'warning':
                    return 'text-warning-800';
                case 'info':
                    return 'text-info-800';
                default:
                    return 'text-info-800';
            }
        })();

        return { bgColor, textColor };
    };

    const getIconPath = (type: AlertProps['type']): string => {
        switch (type) {
            case 'success':
                return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
            case 'error':
                return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
            case 'warning':
                return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
            case 'info':
                return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
            default:
                return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        }
    };

    // 管理每个 alert 的可见性
    const visibilityMap = ref<Map<string, boolean>>(new Map());

    // 当新 alert 添加时，设置其可见性和自动关闭
    const setupAlert = (alert: AlertProps) => {
        // 触发进入动画
        setTimeout(() => {
            visibilityMap.value.set(alert.id, true);
        }, 10);

        // 自动关闭
        if (alert.duration && alert.duration > 0) {
            setTimeout(() => {
                handleClose(alert.id);
            }, alert.duration);
        }
    };

    const handleClose = (id: string) => {
        visibilityMap.value.set(id, false);
        setTimeout(() => {
            close(id);
            visibilityMap.value.delete(id);
        }, 300);
    };

    // 监听 alerts 变化，为新 alert 设置动画和自动关闭
    const processedIds = new Set<string>();

    watch(
        alerts,
        () => {
            alerts.value.forEach((alert) => {
                if (!processedIds.has(alert.id)) {
                    processedIds.add(alert.id);
                    setupAlert(alert);
                }
            });
        },
        { deep: true }
    );
</script>

<template>
    <div class="alert-container-wrapper">
        <div class="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
            <div
                v-for="alert in alerts"
                :key="alert.id"
                class="alert-item transform transition-all duration-300 ease-out"
                :class="{
                    'translate-y-0 opacity-100': visibilityMap.get(alert.id),
                    '-translate-y-4 opacity-0': !visibilityMap.get(alert.id),
                }"
            >
                <div
                    class="flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg"
                    :class="[getAlertClasses(alert).bgColor, getAlertClasses(alert).textColor]"
                >
                    <!-- Icon -->
                    <svg
                        class="h-6 w-6 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            :d="getIconPath(alert.type)"
                        />
                    </svg>

                    <!-- Message -->
                    <p class="flex-1 text-sm font-medium">{{ alert.message }}</p>

                    <!-- Close Button -->
                    <button
                        class="flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5"
                        @click="handleClose(alert.id)"
                    >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .alert-container-wrapper {
        pointer-events: none;
    }

    .alert-container-wrapper > div > * {
        pointer-events: auto;
    }

    .alert-item {
        min-width: 320px;
        max-width: 500px;
    }
</style>
