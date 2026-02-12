<!-- Copyright (c) 2026. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { ref } from 'vue';

    import SvgIcon from './SvgIcon.vue';

    interface Props {
        modelValue: string;
        placeholder?: string;
        disabled?: boolean;
    }

    interface Emits {
        (e: 'update:modelValue', value: string): void;
        (e: 'input'): void;
    }

    withDefaults(defineProps<Props>(), {
        placeholder: '',
        disabled: false,
    });

    const emit = defineEmits<Emits>();

    const showPassword = ref(false);

    const togglePasswordVisibility = () => {
        showPassword.value = !showPassword.value;
    };

    const handleInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        emit('update:modelValue', target.value);
        emit('input');
    };
</script>

<template>
    <div class="relative">
        <input
            :value="modelValue"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="placeholder"
            :disabled="disabled"
            class="focus:border-primary-400 mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm text-gray-900 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            @input="handleInput"
        />
        <button
            type="button"
            :disabled="disabled"
            class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            style="margin-top: calc(var(--spacing) * 0.75)"
            @click="togglePasswordVisibility"
        >
            <SvgIcon :name="showPassword ? 'eye-off' : 'eye'" class="h-5 w-5" />
        </button>
    </div>
</template>
