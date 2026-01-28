<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { computed } from 'vue';

    import type { Provider } from '@/database/schema';

    interface Props {
        provider: Provider;
        isSelected: boolean;
        hasDefaultModel: boolean;
    }

    interface Emits {
        (e: 'select'): void;
        (e: 'toggle-enabled'): void;
        (e: 'validation-error', message: string): void;
    }

    const props = defineProps<Props>();
    const emit = defineEmits<Emits>();

    const logoPath = computed(() => {
        try {
            return new URL(`../../assets/models/${props.provider.logo}`, import.meta.url).href;
        } catch {
            return '';
        }
    });

    const typeBadgeColor = computed(() => {
        if (props.provider.type === 'openai') {
            return 'bg-openai-light text-openai-dark';
        } else if (props.provider.type === 'claude') {
            return 'bg-claude-light text-claude-dark';
        } else {
            return 'bg-ollama-light text-ollama-dark';
        }
    });

    const isToggleDisabled = computed(() => {
        // 如果服务商已启用且有默认模型，则不能禁用
        return props.provider.enabled === 1 && props.hasDefaultModel;
    });

    const handleToggle = () => {
        // 如果要启用服务商，检查是否填写了必要信息
        if (props.provider.enabled === 0) {
            // 检查 API 端点
            if (!props.provider.api_endpoint || props.provider.api_endpoint.trim() === '') {
                emit('validation-error', '请先配置 API 端点后再启用服务商');
                return;
            }
            // 检查 API Key（可选，根据服务商类型决定）
            // 某些服务商可能不需要 API Key
        }

        emit('toggle-enabled');
    };
</script>

<template>
    <div
        class="provider-card flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-md"
        :class="{
            'border-primary-500 bg-primary-50': isSelected,
            'border-gray-200 bg-white hover:border-gray-300': !isSelected,
        }"
        @click="emit('select')"
    >
        <!-- Logo -->
        <img
            v-if="logoPath"
            :src="logoPath"
            :alt="provider.name"
            class="h-12 w-12 rounded-lg object-contain"
        />
        <div
            v-else
            class="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-xl font-bold text-gray-600"
        >
            {{ provider.name.charAt(0) }}
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
                <h3 class="truncate text-sm font-semibold text-gray-900">
                    {{ provider.name }}
                </h3>
                <span
                    v-if="provider.is_builtin"
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                >
                    内置
                </span>
            </div>
            <span
                class="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                :class="typeBadgeColor"
            >
                {{ provider.type === 'openai' ? 'OpenAI' : 'Claude' }}
            </span>
        </div>

        <!-- Toggle Switch -->
        <label class="relative inline-flex cursor-pointer items-center" @click.stop>
            <input
                type="checkbox"
                :checked="provider.enabled === 1"
                :disabled="isToggleDisabled"
                class="peer sr-only"
                @change="handleToggle"
            />
            <div
                class="peer h-6 w-11 rounded-full transition-colors"
                :class="{
                    'bg-success-600': provider.enabled === 1,
                    'bg-gray-200': provider.enabled === 0,
                    'cursor-not-allowed opacity-50': isToggleDisabled,
                }"
            >
                <div
                    class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                    :class="{
                        'translate-x-5': provider.enabled === 1,
                        'translate-x-0': provider.enabled === 0,
                    }"
                ></div>
            </div>
        </label>
    </div>
</template>

<style scoped>
    .provider-card {
        user-select: none;
    }
</style>
