<!-- Copyright (c) 2026. 千诚. Licensed under GPL v3 -->

<script setup lang="ts" generic="T extends string | number">
    import { computed, onMounted, onUnmounted, ref } from 'vue';

    import SvgIcon from './SvgIcon.vue';

    interface Option {
        label: string;
        value: T;
        description?: string;
    }

    interface Props {
        modelValue: T;
        options: Option[];
        placeholder?: string;
        disabled?: boolean;
    }

    interface Emits {
        (e: 'update:modelValue', value: T): void;
    }

    const props = withDefaults(defineProps<Props>(), {
        placeholder: '请选择',
        disabled: false,
    });

    const emit = defineEmits<Emits>();

    const isOpen = ref(false);
    const selectRef = ref<HTMLElement | null>(null);

    const selectedOption = computed(() => {
        return props.options.find((opt) => opt.value === props.modelValue);
    });

    const toggleDropdown = () => {
        if (!props.disabled) {
            isOpen.value = !isOpen.value;
        }
    };

    const selectOption = (value: T) => {
        emit('update:modelValue', value);
        isOpen.value = false;
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
            isOpen.value = false;
        }
    };

    onMounted(() => {
        document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
        document.removeEventListener('click', handleClickOutside);
    });
</script>

<template>
    <div ref="selectRef" class="relative">
        <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left font-serif text-sm transition-colors"
            :class="{
                'border-gray-200 bg-white text-gray-900 hover:border-gray-300': !disabled,
                'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400': disabled,
                'border-primary-400': isOpen,
            }"
            :disabled="disabled"
            @click="toggleDropdown"
        >
            <span>{{ selectedOption?.label || placeholder }}</span>
            <SvgIcon
                name="chevron-down"
                :class="
                    isOpen
                        ? 'h-4 w-4 rotate-180 transition-transform'
                        : 'h-4 w-4 transition-transform'
                "
            />
        </button>

        <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
        >
            <div
                v-if="isOpen"
                class="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
                <button
                    v-for="option in options"
                    :key="option.value"
                    type="button"
                    class="flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100"
                    :class="{
                        'bg-primary-50 text-primary-600': option.value === modelValue,
                        'text-gray-900': option.value !== modelValue,
                    }"
                    @click="selectOption(option.value)"
                >
                    <span class="font-serif font-medium">{{ option.label }}</span>
                    <span v-if="option.description" class="mt-0.5 text-xs text-gray-400">
                        {{ option.description }}
                    </span>
                </button>
            </div>
        </Transition>
    </div>
</template>
