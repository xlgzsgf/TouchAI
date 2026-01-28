<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import type { Provider } from '@/database/schema';

    import ProviderCard from './ProviderCard.vue';

    interface Props {
        providers: Provider[];
        selectedProviderId: number | null;
        defaultModelProviderIds: Set<number>;
    }

    interface Emits {
        (e: 'select', providerId: number): void;
        (e: 'toggle-enabled', providerId: number): void;
        (e: 'add-custom'): void;
        (e: 'validation-error', message: string): void;
    }

    defineProps<Props>();
    const emit = defineEmits<Emits>();
</script>

<template>
    <div class="flex h-full w-80 flex-col border-r border-gray-200 bg-gray-50">
        <!-- Header -->
        <div class="border-b border-gray-200 bg-white p-4">
            <h2 class="text-lg font-semibold text-gray-900">AI 服务商</h2>
            <p class="mt-1 text-sm text-gray-600">管理 AI 服务商和模型</p>
        </div>

        <!-- Provider List -->
        <div class="flex-1 space-y-2 overflow-y-auto p-4">
            <ProviderCard
                v-for="provider in providers"
                :key="provider.id"
                :provider="provider"
                :is-selected="provider.id === selectedProviderId"
                :has-default-model="defaultModelProviderIds.has(provider.id)"
                @select="emit('select', provider.id)"
                @toggle-enabled="emit('toggle-enabled', provider.id)"
                @validation-error="emit('validation-error', $event)"
            />
        </div>

        <!-- Add Custom Provider Button -->
        <div class="border-t border-gray-200 bg-white p-4">
            <button
                class="bg-primary-600 hover:bg-primary-700 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                @click="emit('add-custom')"
            >
                + 添加自定义服务商
            </button>
        </div>
    </div>
</template>
