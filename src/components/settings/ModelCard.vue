<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import ModelCapabilityTags from '@components/common/ModelCapabilityTags.vue';
    import SvgIcon from '@components/common/SvgIcon.vue';
    import { useAlert } from '@composables/useAlert';
    import { useConfirm } from '@composables/useConfirm';
    import type { Model } from '@database/schema';
    import { getModelLogoByModelName } from '@utils/modelLogoMatcher.ts';
    import { computed } from 'vue';

    interface Props {
        model: Model & {
            metadata_attachment?: number;
            metadata_modalities?: string;
            metadata_open_weights?: number;
            metadata_reasoning?: number;
            metadata_tool_call?: number;
        };
        isDefault: boolean;
        providerEnabled: boolean;
    }

    interface Emits {
        (e: 'update', data: Partial<Model>): void;
        (e: 'delete'): void;
        (e: 'set-default'): void;
        (e: 'edit'): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const alert = useAlert();
    const { confirm } = useConfirm();

    // 使用 Vite 的 glob import 预加载所有模型 logo
    const modelLogos = import.meta.glob<{ default: string }>('../../assets/logos/models/*', {
        eager: true,
    });

    const providerLogo = computed(() => {
        const logoFileName = getModelLogoByModelName(props.model.model_id);
        if (!logoFileName) return null;

        const path = `../../assets/logos/models/${logoFileName}`;
        return modelLogos[path]?.default || null;
    });

    const handleDelete = async () => {
        if (props.isDefault) {
            alert.error('无法删除默认模型，请先设置其他模型为默认');
            return;
        }

        const confirmed = await confirm({
            title: '确认删除',
            message: `确定要删除模型 "${props.model.name}" 吗？`,
            type: 'danger',
            confirmText: '删除',
            cancelText: '取消',
        });

        if (confirmed) {
            emit('delete');
        }
    };
</script>

<template>
    <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-center gap-3">
            <div class="relative">
                <input
                    type="radio"
                    name="default-model"
                    :checked="isDefault"
                    :disabled="!providerEnabled"
                    :class="[
                        'text-primary-500 mt-1 h-4 w-4',
                        !providerEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                    ]"
                    :title="!providerEnabled ? '请先启用本服务商' : '设为默认模型'"
                    @change="emit('set-default')"
                />
            </div>

            <div class="relative">
                <img
                    v-if="providerLogo"
                    :src="providerLogo"
                    :alt="model.name"
                    :class="[
                        'h-8 w-8 rounded-full object-cover transition-colors',
                        isDefault ? 'border-primary-500 border-2' : '',
                    ]"
                />
                <div
                    v-else
                    :class="[
                        'flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500',
                        isDefault ? 'border-primary-500 border-2' : '',
                    ]"
                >
                    {{ model.name.charAt(0) }}
                </div>
            </div>

            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <h4 class="font-serif text-sm font-medium text-gray-900">{{ model.name }}</h4>

                    <ModelCapabilityTags :model="model" />
                </div>

                <p v-if="model.last_used_at" class="mt-1 text-xs text-gray-400">
                    最后使用: {{ new Date(model.last_used_at as string).toLocaleString('zh-CN') }}
                </p>
            </div>

            <div class="flex gap-1">
                <button
                    class="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="编辑"
                    @click="emit('edit')"
                >
                    <SvgIcon name="edit" class="h-4 w-4" />
                </button>
                <button
                    class="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="删除"
                    @click="handleDelete"
                >
                    <SvgIcon name="delete" class="h-4 w-4" />
                </button>
            </div>
        </div>
    </div>
</template>
