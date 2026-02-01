<!-- Copyright (c) 2026. Qian Cheng. Licensed under GPL v3 -->

<script setup lang="ts">
    import type { Attachment } from '@utils/attachment.ts';
    import { computed } from 'vue';

    import SvgIcon from '@/components/common/SvgIcon.vue';
    import AttachmentOverflow from '@/components/search/AttachmentOverflow.vue';

    interface Props {
        attachments: Attachment[];
        maxVisible?: number;
    }

    const props = withDefaults(defineProps<Props>(), {
        maxVisible: 4,
    });

    const emit = defineEmits<{
        remove: [id: string];
        preview: [attachment: Attachment];
        overflowStateChange: [isOpen: boolean];
    }>();

    // 计算可见附件和溢出附件
    const visibleAttachments = computed(() => {
        return props.attachments.slice(0, props.maxVisible);
    });

    const overflowAttachments = computed(() => {
        return props.attachments.slice(props.maxVisible);
    });

    const hasOverflow = computed(() => {
        return props.attachments.length > props.maxVisible;
    });

    function handleRemove(id: string) {
        emit('remove', id);
    }

    function handlePreview(attachment: Attachment) {
        emit('preview', attachment);
    }

    function handleOverflowStateChange(isOpen: boolean) {
        emit('overflowStateChange', isOpen);
    }
</script>

<template>
    <div v-if="attachments.length > 0" class="flex max-w-[30%] items-center gap-2">
        <div
            v-for="attachment in visibleAttachments"
            :key="attachment.id"
            :title="attachment.name"
            class="bg-background-primary group relative flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded border border-gray-200 px-2 py-1 transition-colors hover:border-gray-300"
            @click="handlePreview(attachment)"
        >
            <img
                v-if="attachment.preview"
                :src="attachment.preview"
                :alt="attachment.name"
                class="h-6 w-6 rounded object-cover"
            />

            <button
                class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-500"
                @click.stop="handleRemove(attachment.id)"
            >
                <SvgIcon name="x" class="h-2 w-2 text-white" />
            </button>
        </div>

        <AttachmentOverflow
            v-if="hasOverflow"
            :attachments="overflowAttachments"
            @remove="handleRemove"
            @preview="handlePreview"
            @dropdown-state-change="handleOverflowStateChange"
        />
    </div>
</template>
