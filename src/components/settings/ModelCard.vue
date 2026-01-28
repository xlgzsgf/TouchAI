<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { ref } from 'vue';

    import { useAlert } from '@/composables/useAlert';
    import type { Model } from '@/database/schema';

    interface Props {
        model: Model;
        isDefault: boolean;
    }

    interface Emits {
        (e: 'update', data: Partial<Model>): void;
        (e: 'delete'): void;
        (e: 'set-default'): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const alert = useAlert();

    const isEditing = ref(false);
    const editForm = ref({
        name: props.model.name,
        model_id: props.model.model_id,
        max_tokens: props.model.max_tokens || undefined,
        temperature: props.model.temperature || undefined,
    });

    const startEdit = () => {
        editForm.value = {
            name: props.model.name,
            model_id: props.model.model_id,
            max_tokens: props.model.max_tokens || undefined,
            temperature: props.model.temperature || undefined,
        };
        isEditing.value = true;
    };

    const saveEdit = () => {
        emit('update', {
            name: editForm.value.name,
            model_id: editForm.value.model_id,
            max_tokens: editForm.value.max_tokens || null,
            temperature: editForm.value.temperature || null,
        });
        isEditing.value = false;
    };

    const cancelEdit = () => {
        isEditing.value = false;
    };

    const handleDelete = () => {
        if (props.isDefault) {
            alert.error('无法删除默认模型，请先设置其他模型为默认');
            return;
        }
        if (confirm(`确定要删除模型 "${props.model.name}" 吗？`)) {
            emit('delete');
        }
    };
</script>

<template>
    <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-start gap-3">
            <!-- Default Radio -->
            <input
                type="radio"
                name="default-model"
                :checked="isDefault"
                class="text-primary-600 mt-1 h-4 w-4 cursor-pointer"
                @change="emit('set-default')"
            />

            <!-- Content -->
            <div class="min-w-0 flex-1">
                <div v-if="!isEditing">
                    <div class="flex items-center gap-2">
                        <h4 class="text-sm font-semibold text-gray-900">{{ model.name }}</h4>
                        <span
                            v-if="isDefault"
                            class="bg-ollama-light text-ollama-dark rounded-full px-2 py-0.5 text-xs font-medium"
                        >
                            默认
                        </span>
                    </div>
                    <div
                        v-if="model.max_tokens || model.temperature"
                        class="mt-2 flex gap-3 text-xs text-gray-500"
                    >
                        <span v-if="model.max_tokens">Max Tokens: {{ model.max_tokens }}</span>
                        <span v-if="model.temperature">Temperature: {{ model.temperature }}</span>
                    </div>
                    <p v-if="model.last_used_at" class="mt-1 text-xs text-gray-400">
                        最后使用: {{ new Date(model.last_used_at).toLocaleString('zh-CN') }}
                    </p>
                </div>

                <!-- Edit Form -->
                <div v-else class="space-y-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-700">模型名称</label>
                        <input
                            v-model="editForm.name"
                            type="text"
                            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="GPT-4o"
                        />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700">模型 ID</label>
                        <input
                            v-model="editForm.model_id"
                            type="text"
                            class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="gpt-4o"
                        />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700">
                                Max Tokens
                            </label>
                            <input
                                v-model.number="editForm.max_tokens"
                                type="number"
                                class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                placeholder="4096"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700">
                                Temperature
                            </label>
                            <input
                                v-model.number="editForm.temperature"
                                type="number"
                                step="0.1"
                                min="0"
                                max="2"
                                class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                placeholder="0.7"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2">
                <button
                    v-if="!isEditing"
                    class="bg-primary-600 hover:bg-primary-700 rounded-md px-3 py-1 text-xs font-medium text-white"
                    @click="startEdit"
                >
                    编辑
                </button>
                <button
                    v-if="!isEditing"
                    class="bg-danger-600 hover:bg-danger-700 rounded-md px-3 py-1 text-xs font-medium text-white"
                    @click="handleDelete"
                >
                    删除
                </button>
                <button
                    v-if="isEditing"
                    class="bg-success-600 hover:bg-success-700 rounded-md px-3 py-1 text-xs font-medium text-white"
                    @click="saveEdit"
                >
                    保存
                </button>
                <button
                    v-if="isEditing"
                    class="rounded-md bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
                    @click="cancelEdit"
                >
                    取消
                </button>
            </div>
        </div>
    </div>
</template>
