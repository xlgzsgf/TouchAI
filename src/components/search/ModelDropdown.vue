<!-- Copyright (c) 2026. Qian Cheng. Licensed under GPL v3 -->

<script setup lang="ts">
    import { findModelsWithProvider } from '@database/queries';
    import { getModelLogoByModelName } from '@utils/modelLogoMatcher';
    import { computed, nextTick, onMounted, ref, watch } from 'vue';

    interface ModelOption {
        id: number;
        modelId: string;
        name: string;
        providerName: string;
        logo: string | null;
    }

    interface Props {
        isOpen: boolean;
        activeModelId: string;
        searchQuery: string;
    }

    interface Emits {
        (e: 'select', modelDbId: number): void;
        (e: 'close'): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const models = ref<ModelOption[]>([]);
    const highlightedIndex = ref(0);
    const dropdownRef = ref<HTMLElement | null>(null);
    const itemRefs = ref<HTMLElement[]>([]);

    // 加载启用的模型
    async function loadModels() {
        try {
            const data = await findModelsWithProvider();
            // 只显示服务商已启用的模型
            models.value = data
                .filter((m) => m.provider_enabled === 1)
                .map((m) => ({
                    id: m.id,
                    modelId: m.model_id,
                    name: m.name,
                    providerName: m.provider_name,
                    logo: getModelLogoByModelName(m.model_id),
                }));
        } catch (error) {
            console.error('[ModelDropdown] Failed to load models:', error);
        }
    }

    // 初始加载
    onMounted(async () => {
        await loadModels();
    });

    // 根据搜索查询过滤模型
    const filteredModels = computed(() => {
        if (!props.searchQuery) return models.value;
        const query = props.searchQuery.toLowerCase();
        return models.value.filter(
            (m) =>
                m.name.toLowerCase().includes(query) ||
                m.modelId.toLowerCase().includes(query) ||
                m.providerName.toLowerCase().includes(query)
        );
    });

    // 滚动到高亮的项
    const scrollToHighlighted = async () => {
        await nextTick();
        const highlightedElement = itemRefs.value[highlightedIndex.value];
        if (highlightedElement && dropdownRef.value) {
            highlightedElement.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    };

    // 键盘导航
    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            highlightedIndex.value = Math.min(
                highlightedIndex.value + 1,
                filteredModels.value.length - 1
            );
            scrollToHighlighted();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
            scrollToHighlighted();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const model = filteredModels.value[highlightedIndex.value];
            if (model) emit('select', model.id);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            emit('close');
        }
    }

    // 获取焦点
    function focus() {
        dropdownRef.value?.focus();
    }

    // 重置高亮索引当搜索改变时
    watch(
        () => props.searchQuery,
        () => {
            highlightedIndex.value = 0;
        }
    );

    // 重置高亮索引当下拉框打开时
    watch(
        () => props.isOpen,
        async (newVal) => {
            if (newVal) {
                highlightedIndex.value = 0;
                // 每次打开下拉框时重新加载模型列表
                await loadModels();
            }
        }
    );

    // 暴露键盘处理函数和焦点函数给父组件
    defineExpose({
        handleKeyDown,
        focus,
    });
</script>

<template>
    <div
        v-if="isOpen"
        ref="dropdownRef"
        class="custom-scrollbar-thin absolute top-full left-0 z-[9999] mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
        <div v-if="!searchQuery" class="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
            输入模型名称搜索
        </div>
        <div
            v-for="(model, index) in filteredModels"
            :key="model.id"
            :ref="
                (el) => {
                    if (el) itemRefs[index] = el as HTMLElement;
                }
            "
            :class="[
                'flex cursor-pointer items-center gap-3 px-4 py-2',
                index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50',
            ]"
            @click="emit('select', model.id)"
        >
            <img
                v-if="model.logo"
                :src="`/src/assets/logos/models/${model.logo}`"
                :alt="model.name"
                class="h-6 w-6 rounded"
            />
            <div class="flex-1">
                <div class="text-sm font-medium">{{ model.name }}</div>
                <div class="text-xs text-gray-500">{{ model.providerName }}</div>
            </div>
        </div>
        <div v-if="filteredModels.length === 0" class="px-4 py-3 text-sm text-gray-500">
            {{ searchQuery ? '没有找到匹配的模型' : '请先在设置中心配置模型' }}
        </div>
    </div>
</template>
