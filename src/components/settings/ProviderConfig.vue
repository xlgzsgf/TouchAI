<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { ref, watch } from 'vue';

    import { useAlert } from '@/composables/useAlert';
    import type { Provider } from '@/database/schema';

    interface Props {
        provider: Provider;
    }

    interface Emits {
        (e: 'update', data: Partial<Provider>): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const alert = useAlert();

    const form = ref({
        api_endpoint: props.provider.api_endpoint,
        api_key: props.provider.api_key || '',
    });

    watch(
        () => props.provider,
        (newProvider) => {
            form.value = {
                api_endpoint: newProvider.api_endpoint,
                api_key: newProvider.api_key || '',
            };
        }
    );

    const handleSave = () => {
        if (!form.value.api_endpoint) {
            alert.error('请填写 API 端点');
            return;
        }

        emit('update', {
            api_endpoint: form.value.api_endpoint,
            api_key: form.value.api_key || null,
        });
    };
</script>

<template>
    <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h3 class="mb-4 text-base font-semibold text-gray-900">服务商配置</h3>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">API 端点 *</label>
                <input
                    v-model="form.api_endpoint"
                    type="text"
                    class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="https://api.openai.com"
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
                <p class="mt-1 text-xs text-gray-500">API 密钥，留空则使用环境变量或默认配置</p>
            </div>

            <button
                class="bg-success-600 hover:bg-success-700 w-full rounded-lg px-4 py-2 text-sm font-medium text-white"
                @click="handleSave"
            >
                保存配置
            </button>
        </div>
    </div>
</template>
