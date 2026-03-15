import { type ModelDropdownData, popupManager } from '@services/PopupService';
import { computed, onMounted, onUnmounted } from 'vue';

interface UseModelDropdownPopupOptions {
    getAnchorElement: () => HTMLElement | null;
    getPopupData: () => ModelDropdownData;
    isModelDropdownActive: () => boolean;
    onModelSelect: (modelDbId: number) => Promise<void> | void;
    onClose: () => void;
}

/**
 * 模型下拉弹窗驱动层。
 * 负责封装 popupManager 交互、弹窗数据组装和全局 popup 事件监听，
 * 让模型选择领域逻辑不再直接依赖 popup 基础设施实现细节。
 *
 * @param options 模型下拉框触发元素、弹窗上下文数据和事件回调。
 * @returns 模型下拉弹窗状态与打开/关闭/更新方法。
 */
export function useModelDropdownPopup(options: UseModelDropdownPopupOptions) {
    const { getAnchorElement, getPopupData, isModelDropdownActive, onModelSelect, onClose } =
        options;

    let cleanupFn: (() => void) | null = null;
    let hasActivePopupSession = false;

    const isOpen = computed(() => {
        return (
            popupManager.state.isOpen && popupManager.state.currentType === 'model-dropdown-popup'
        );
    });

    /**
     * 打开模型下拉弹窗。
     * 弹窗驱动层只依赖页面层已准备好的锚点与数据，不承担页面布局时序控制。
     *
     * @returns Promise<void>
     */
    async function open() {
        const anchorElement = getAnchorElement();
        if (!anchorElement) {
            return;
        }

        await popupManager.toggle('model-dropdown-popup', anchorElement, getPopupData());
        hasActivePopupSession = true;
    }

    /**
     * 关闭模型下拉弹窗。
     *
     * @returns Promise<void>
     */
    async function close() {
        if (!hasActivePopupSession && !isOpen.value) {
            return;
        }

        await popupManager.hide();
    }

    /**
     * 将最新的模型筛选上下文同步到 popup 窗口。
     *
     * @returns Promise<void>
     */
    async function updateData() {
        if (!hasActivePopupSession || !isOpen.value) {
            return;
        }

        await popupManager.updateData(getPopupData());
    }

    onMounted(async () => {
        cleanupFn = await popupManager.listen({
            onModelSelect: (modelDbId) => {
                void Promise.resolve(onModelSelect(modelDbId)).catch((error) => {
                    console.error('[SearchView] Failed to handle model dropdown selection:', error);
                });
            },
            onClose: () => {
                if (!hasActivePopupSession) {
                    return;
                }

                hasActivePopupSession = false;

                // popup-closed 是全局事件，这里只在模型下拉实际持有会话时
                // 才回流到领域层，避免其他 popup 关闭时误重置模型搜索状态。
                if (!isModelDropdownActive()) {
                    return;
                }
                onClose();
            },
        });
    });

    onUnmounted(() => {
        cleanupFn?.();
        cleanupFn = null;
    });

    return {
        isOpen,
        open,
        close,
        updateData,
    };
}
