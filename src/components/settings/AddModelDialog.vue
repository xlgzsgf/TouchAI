<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { useAlert } from '@composables/useAlert';
    import type { NewModel } from '@database/schema';
    import { ref } from 'vue';

    interface Props {
        providerId: number;
    }

    interface Emits {
        (e: 'create', data: NewModel): void;
        (e: 'cancel'): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const alert = useAlert();

    const form = ref({
        name: '',
        model_id: '',
    });

    const handleSave = () => {
        if (!form.value.name || !form.value.model_id) {
            alert.error('请填写模型名称和模型 ID');
            return;
        }

        emit('create', {
            provider_id: props.providerId,
            name: form.value.name,
            model_id: form.value.model_id,
            is_default: 0,
        });
    };
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 class="mb-5 font-serif text-base font-bold text-gray-900">添加模型</h2>

            <div class="space-y-4">
                <div>
                    <label class="block font-serif text-sm font-medium text-gray-600">
                        模型名称 *
                    </label>
                    <input
                        v-model="form.name"
                        type="text"
                        class="focus:border-primary-400 mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 font-serif text-sm text-gray-900 transition-colors focus:outline-none"
                        placeholder="GPT-4o"
                    />
                    <p class="mt-1 text-xs text-gray-400">用于显示的模型名称</p>
                </div>

                <div>
                    <label class="block font-serif text-sm font-medium text-gray-600">
                        模型 ID *
                    </label>
                    <input
                        v-model="form.model_id"
                        type="text"
                        class="focus:border-primary-400 mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 font-serif text-sm text-gray-900 transition-colors focus:outline-none"
                        placeholder="gpt-4o"
                    />
                    <p class="mt-1 text-xs text-gray-400">API 调用时使用的模型标识符</p>
                </div>
            </div>

            <div class="mt-6 flex gap-3">
                <button
                    class="bg-primary-500 hover:bg-primary-600 flex-1 rounded-lg px-4 py-2 font-serif text-sm font-medium text-white transition-colors"
                    @click="handleSave"
                >
                    创建
                </button>
                <button
                    class="flex-1 rounded-lg border border-gray-200 px-4 py-2 font-serif text-sm font-medium text-gray-600 transition-colors hover:border-gray-300"
                    @click="emit('cancel')"
                >
                    取消
                </button>
            </div>
        </div>
    </div>
</template>
