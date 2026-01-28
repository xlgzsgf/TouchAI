<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { ref } from 'vue';

    import { useAlert } from '@/composables/useAlert';
    import type { NewProvider, ProviderType } from '@/database/schema';

    interface Emits {
        (e: 'create', data: NewProvider): void;
        (e: 'cancel'): void;
    }

    const emit = defineEmits<Emits>();

    const alert = useAlert();

    const form = ref<Partial<NewProvider>>({
        name: '',
        type: 'openai',
        api_endpoint: '',
        api_key: '',
        logo: 'openai.png',
        enabled: 1,
        is_builtin: 0,
    });

    const handleTypeChange = () => {
        // 根据类型自动设置 logo
        form.value.logo = form.value.type === 'openai' ? 'openai.png' : 'claude.png';
    };

    const handleSave = () => {
        if (!form.value.name || !form.value.api_endpoint) {
            alert.error('请填写服务商名称和 API 端点');
            return;
        }

        emit('create', {
            name: form.value.name,
            type: form.value.type as ProviderType,
            api_endpoint: form.value.api_endpoint,
            api_key: form.value.api_key || null,
            logo: form.value.logo!,
            enabled: form.value.enabled!,
            is_builtin: 0,
        });
    };
</script>

<template>
    <div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 class="mb-4 text-lg font-semibold text-gray-900">添加自定义服务商</h2>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">服务商名称 *</label>
                    <input
                        v-model="form.name"
                        type="text"
                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="My Custom OpenAI"
                    />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700">服务商类型 *</label>
                    <select
                        v-model="form.type"
                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        @change="handleTypeChange"
                    >
                        <option value="openai">OpenAI</option>
                        <option value="claude">Claude</option>
                    </select>
                    <p class="mt-1 text-xs text-gray-500">选择 API 兼容类型，Logo 将自动设置</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700">API 端点 *</label>
                    <input
                        v-model="form.api_endpoint"
                        type="text"
                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="https://api.example.com"
                    />
                    <p class="mt-1 text-xs text-gray-500">
                        API 基础地址，系统会自动添加 /v1 后缀（如需要）
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700">API Key</label>
                    <input
                        v-model="form.api_key"
                        type="password"
                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="sk-..."
                    />
                </div>

                <div class="flex items-center">
                    <input
                        id="enabled"
                        v-model="form.enabled"
                        type="checkbox"
                        :true-value="1"
                        :false-value="0"
                        class="text-primary-600 h-4 w-4 rounded border-gray-300"
                    />
                    <label for="enabled" class="ml-2 text-sm text-gray-700">创建后立即启用</label>
                </div>
            </div>

            <div class="mt-6 flex gap-3">
                <button
                    class="bg-primary-600 hover:bg-primary-700 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white"
                    @click="handleSave"
                >
                    创建
                </button>
                <button
                    class="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                    @click="emit('cancel')"
                >
                    取消
                </button>
            </div>
        </div>
    </div>
</template>
