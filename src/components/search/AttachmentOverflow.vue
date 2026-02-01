<!-- Copyright (c) 2026. Qian Cheng. Licensed under GPL v3 -->

<script setup lang="ts">
    import SvgIcon from '@components/common/SvgIcon.vue';
    import type { Attachment } from '@utils/attachment.ts';
    import { ref } from 'vue';

    interface Props {
        attachments: Attachment[];
    }

    defineProps<Props>();

    const emit = defineEmits<{
        remove: [id: string];
        preview: [attachment: Attachment];
        dropdownStateChange: [isOpen: boolean];
    }>();

    const isOpen = ref(false);

    function openDropdown() {
        isOpen.value = true;
        emit('dropdownStateChange', true);
    }

    function closeDropdown() {
        isOpen.value = false;
        emit('dropdownStateChange', false);
    }
</script>

<template>
    <div class="relative" @mouseenter="openDropdown" @mouseleave="closeDropdown">
        <div
            class="group flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-gray-200 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-300"
        >
            <span>+{{ attachments.length }}</span>
        </div>

        <div
            v-if="isOpen"
            class="custom-scrollbar-thin absolute top-full right-0 z-[9999] mt-2 max-h-80 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
            <div
                v-for="attachment in attachments"
                :key="attachment.id"
                :title="attachment.name"
                class="group relative flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50"
                @click="emit('preview', attachment)"
            >
                <img
                    v-if="attachment.preview"
                    :src="attachment.preview"
                    :alt="attachment.name"
                    class="h-10 w-10 flex-shrink-0 rounded object-cover"
                />
                <div
                    v-else
                    class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-blue-100 text-xs font-medium text-blue-700"
                >
                    {{ attachment.name.split('.').pop()?.toUpperCase().slice(0, 3) || 'FILE' }}
                </div>

                <div class="flex-1 overflow-hidden">
                    <p class="truncate text-sm font-medium text-gray-900">{{ attachment.name }}</p>
                    <p class="text-xs text-gray-500">
                        {{ attachment.type === 'image' ? '图片' : '文件' }}
                    </p>
                </div>

                <button
                    class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600"
                    @click.stop="emit('remove', attachment.id)"
                >
                    <SvgIcon name="x" class="h-3.5 w-3.5" />
                </button>
            </div>
        </div>

        <div v-if="isOpen" class="fixed inset-0 z-[9998]" @click="closeDropdown"></div>
    </div>
</template>
