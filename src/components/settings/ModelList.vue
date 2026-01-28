<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { ref } from 'vue';

    import { useAlert } from '@/composables/useAlert';
    import type { Model, NewModel, Provider } from '@/database/schema';

    import ModelCard from './ModelCard.vue';

    interface Props {
        providerId: number;
        models: Model[];
        defaultModelId: number | null;
        provider: Provider | undefined;
    }

    interface Emits {
        (e: 'create', data: NewModel): void;
        (e: 'update', id: number, data: Partial<Model>): void;
        (e: 'delete', id: number): void;
        (e: 'set-default', id: number): void;
        (e: 'refresh'): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const alert = useAlert();

    const isCreating = ref(false);
    const createForm = ref<Partial<NewModel>>({
        name: '',
        model_id: '',
        max_tokens: undefined,
        temperature: undefined,
    });

    const startCreate = () => {
        createForm.value = {
            name: '',
            model_id: '',
            max_tokens: undefined,
            temperature: undefined,
        };
        isCreating.value = true;
    };

    const saveCreate = () => {
        if (!createForm.value.name || !createForm.value.model_id) {
            alert.error('请填写模型名称和模型 ID');
            return;
        }

        emit('create', {
            provider_id: props.providerId,
            name: createForm.value.name,
            model_id: createForm.value.model_id,
            max_tokens: createForm.value.max_tokens || null,
            temperature: createForm.value.temperature || null,
            is_default: 0,
        });

        isCreating.value = false;
    };

    const cancelCreate = () => {
        isCreating.value = false;
    };

    const handleRefresh = () => {
        // 检查是否已配置端点
        if (!props.provider) {
            alert.error('服务商信息不存在');
            return;
        }

        if (!props.provider.api_endpoint) {
            alert.warning('请先配置 API 端点');
            return;
        }

        emit('refresh');
    };
</script>

<template>
    <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">模型列表</h3>
            <div class="flex gap-2">
                <button
                    class="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                    title="从服务商刷新模型列表"
                    @click="handleRefresh"
                >
                    🔄 刷新
                </button>
                <button
                    class="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white"
                    @click="startCreate"
                >
                    + 添加模型
                </button>
            </div>
        </div>

        <!-- Create Form -->
        <div v-if="isCreating" class="rounded-lg border border-gray-200 bg-white p-4">
            <h4 class="mb-3 text-sm font-semibold text-gray-900">新增模型</h4>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700">模型名称 *</label>
                    <input
                        v-model="createForm.name"
                        type="text"
                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="GPT-4o"
                    />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700">模型 ID *</label>
                    <input
                        v-model="createForm.model_id"
                        type="text"
                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="gpt-4o"
                    />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-700">Max Tokens</label>
                        <input
                            v-model.number="createForm.max_tokens"
                            type="number"
                            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="4096"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700">Temperature</label>
                        <input
                            v-model.number="createForm.temperature"
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="0.7"
                        />
                    </div>
                </div>
                <div class="flex gap-2">
                    <button
                        class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        @click="saveCreate"
                    >
                        保存
                    </button>
                    <button
                        class="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                        @click="cancelCreate"
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div
            v-if="models.length === 0 && !isCreating"
            class="rounded-lg border border-gray-200 bg-white p-8 text-center"
        >
            <div class="mx-auto max-w-sm">
                <svg
                    class="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">暂无模型</h3>
                <p class="mt-1 text-sm text-gray-500">
                    <template v-if="!provider?.api_endpoint">
                        请先在上方配置 API 端点，然后点击下方按钮获取模型列表
                    </template>
                    <template v-else>点击下方按钮从服务商获取模型列表，或手动添加模型</template>
                </p>
                <div class="mt-6 flex justify-center gap-3">
                    <button
                        class="bg-primary-600 hover:bg-primary-700 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white"
                        @click="handleRefresh"
                    >
                        <svg
                            class="mr-2 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        获取模型列表
                    </button>
                    <button
                        class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        @click="startCreate"
                    >
                        <svg
                            class="mr-2 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        手动添加
                    </button>
                </div>
            </div>
        </div>

        <!-- Model List -->
        <div v-else-if="models.length > 0" class="space-y-3">
            <ModelCard
                v-for="model in models"
                :key="model.id"
                :model="model"
                :is-default="model.id === defaultModelId"
                @update="(data) => emit('update', model.id, data)"
                @delete="emit('delete', model.id)"
                @set-default="emit('set-default', model.id)"
            />
        </div>
    </div>
</template>
