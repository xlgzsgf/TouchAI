// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { ref } from 'vue';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
}

interface ConfirmState extends ConfirmOptions {
    show: boolean;
    resolve: ((value: boolean) => void) | null;
}

const confirmState = ref<ConfirmState>({
    show: false,
    message: '',
    resolve: null,
});

export function useConfirm() {
    const confirm = (options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            confirmState.value = {
                show: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText,
                cancelText: options.cancelText,
                type: options.type,
                resolve,
            };
        });
    };

    const handleConfirm = () => {
        if (confirmState.value.resolve) {
            confirmState.value.resolve(true);
        }
        confirmState.value.show = false;
        confirmState.value.resolve = null;
    };

    const handleCancel = () => {
        if (confirmState.value.resolve) {
            confirmState.value.resolve(false);
        }
        confirmState.value.show = false;
        confirmState.value.resolve = null;
    };

    return {
        confirmState,
        confirm,
        handleConfirm,
        handleCancel,
    };
}
