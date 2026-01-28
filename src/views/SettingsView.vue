<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import { computed, onMounted, ref } from 'vue';

    import AddProviderDialog from '@/components/settings/AddProviderDialog.vue';
    import ModelList from '@/components/settings/ModelList.vue';
    import ProviderConfig from '@/components/settings/ProviderConfig.vue';
    import ProviderList from '@/components/settings/ProviderList.vue';
    import { useAlert } from '@/composables/useAlert';
    import {
        createModel,
        createProvider,
        deleteModel,
        deleteProvider,
        findAllModels,
        findAllProvidersSorted,
        findDefaultModel,
        findProviderById,
        setDefaultModel,
        updateModel,
        updateProvider,
    } from '@/database/queries';
    import type { Model, NewModel, NewProvider, Provider } from '@/database/schema';
    import { aiService } from '@/services/ai/manager';
    let logos = import.meta.glob('@assets/models/*.png');

    const alert = useAlert();

    const getLogoUrl = (logo: string) => {
        if (!logo || !logos) {
            return '';
        }
        return Object.keys(logos).find((key) => key.endsWith(logo));
    };

    const providers = ref<Provider[]>([]);
    const models = ref<Model[]>([]);
    const selectedProviderId = ref<number | null>(null);
    const defaultModelId = ref<number | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const showAddDialog = ref(false);
    const refreshing = ref(false);

    // 计算属性
    const selectedProvider = computed(() =>
        providers.value.find((p) => p.id === selectedProviderId.value)
    );

    const selectedProviderModels = computed(() =>
        models.value.filter((m) => m.provider_id === selectedProviderId.value)
    );

    const defaultModelProviderIds = computed(() => {
        const ids = new Set<number>();
        const defaultModel = models.value.find((m) => m.is_default === 1);
        if (defaultModel) {
            ids.add(defaultModel.provider_id);
        }
        return ids;
    });

    // 加载数据
    const loadData = async () => {
        try {
            loading.value = true;
            error.value = null;

            [providers.value, models.value] = await Promise.all([
                findAllProvidersSorted(),
                findAllModels(),
            ]);

            const defaultModel = await findDefaultModel();
            defaultModelId.value = defaultModel?.id || null;

            // 自动选择第一个服务商
            if (providers.value.length > 0 && !selectedProviderId.value) {
                selectedProviderId.value = providers.value[0]?.id || null;
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : '加载失败';
            console.error('Failed to load data:', err);
        } finally {
            loading.value = false;
        }
    };

    // 服务商操作
    const selectProvider = async (providerId: number) => {
        selectedProviderId.value = providerId;

        // 检查是否需要自动获取模型列表
        const provider = providers.value.find((p) => p.id === providerId);
        if (!provider) return;

        const providerModels = models.value.filter((m) => m.provider_id === providerId);

        // 如果没有模型，且已配置端点，则自动获取
        if (providerModels.length === 0 && provider.api_endpoint) {
            try {
                await handleRefreshModels(true);
            } catch (err) {
                console.error('Auto-fetch models failed:', err);
            }
        }
    };

    const toggleProviderEnabled = async (providerId: number) => {
        try {
            const provider = providers.value.find((p) => p.id === providerId);
            if (!provider) return;

            const newEnabled = provider.enabled === 1 ? 0 : 1;
            await updateProvider(providerId, { enabled: newEnabled });
            await loadData();

            if (newEnabled === 1) {
                alert.success('服务商已启用');
            } else {
                alert.info('服务商已禁用');
            }
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '操作失败');
        }
    };

    const handleValidationError = (message: string) => {
        alert.error(message);
    };

    const handleUpdateProvider = async (data: Partial<Provider>) => {
        if (!selectedProviderId.value) return;

        try {
            await updateProvider(selectedProviderId.value, data);
            // 清除该服务商的缓存，使新配置立即生效
            aiService.clearProviderCache(selectedProviderId.value);
            await loadData();
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleAddCustomProvider = () => {
        showAddDialog.value = true;
    };

    const handleCreateProvider = async (data: NewProvider) => {
        try {
            await createProvider(data);
            await loadData();
            showAddDialog.value = false;
            alert.success('创建成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '创建失败');
        }
    };

    const handleDeleteProvider = async (providerId: number) => {
        try {
            await deleteProvider(providerId);
            await loadData();
            if (selectedProviderId.value === providerId) {
                selectedProviderId.value = providers.value[0]?.id || null;
            }
            alert.success('删除成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '删除失败');
        }
    };

    // 模型操作
    const handleCreateModel = async (data: NewModel) => {
        try {
            await createModel(data);
            await loadData();
            alert.success('创建成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '创建失败');
        }
    };

    const handleUpdateModel = async (id: number, data: Partial<Model>) => {
        try {
            await updateModel(id, data);
            // 清除所有缓存，因为模型配置可能影响多个服务商
            aiService.clearProviderCache();
            await loadData();
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleDeleteModel = async (id: number) => {
        try {
            await deleteModel(id);
            await loadData();
            alert.success('删除成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '删除失败');
        }
    };

    const handleSetDefaultModel = async (id: number) => {
        try {
            await setDefaultModel(id);
            await loadData();
            alert.success('设置成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '设置失败');
        }
    };

    // 刷新模型列表
    const handleRefreshModels = async (silent = false) => {
        if (!selectedProviderId.value) return;

        try {
            refreshing.value = true;
            const provider = await findProviderById(selectedProviderId.value);
            if (!provider) {
                if (!silent) alert.error('服务商不存在');
                return;
            }

            // 先尝试不带 key 获取模型列表
            let providerInstance = aiService.createProviderInstance(
                provider.type,
                provider.api_endpoint,
                'placeholder_for_models'
            );

            let fetchedModels;
            try {
                fetchedModels = await providerInstance.listModels();
            } catch (error) {
                // 如果失败，检查是否是认证错误
                const errorMessage = error instanceof Error ? error.message : String(error);
                const isAuthError =
                    errorMessage.includes('401') ||
                    errorMessage.includes('403') ||
                    errorMessage.includes('Unauthorized') ||
                    errorMessage.includes('authentication') ||
                    errorMessage.includes('API key');

                if (isAuthError && provider.api_key) {
                    // 如果是认证错误且已配置 key，尝试带 key 重新获取
                    providerInstance = aiService.createProviderInstance(
                        provider.type,
                        provider.api_endpoint,
                        provider.api_key
                    );
                    fetchedModels = await providerInstance.listModels();
                } else if (isAuthError && !provider.api_key) {
                    // 如果是认证错误且未配置 key，提示用户
                    if (!silent) {
                        alert.warning('该服务商需要配置 API Key 才能获取模型列表');
                    }
                    return;
                } else {
                    // 其他错误，重新抛出
                    throw error;
                }
            }

            if (fetchedModels.length === 0) {
                if (!silent) alert.info('未获取到模型列表');
                return;
            }

            // 获取当前服务商的现有模型
            const existingModels = models.value.filter((m) => m.provider_id === provider.id);
            const existingModelIds = new Set(existingModels.map((m) => m.model_id));

            // 添加新模型
            let addedCount = 0;
            for (const fetchedModel of fetchedModels) {
                if (!existingModelIds.has(fetchedModel.id)) {
                    await createModel({
                        provider_id: provider.id,
                        name: fetchedModel.name,
                        model_id: fetchedModel.id,
                        max_tokens: null,
                        temperature: null,
                        is_default: 0,
                    });
                    addedCount++;
                }
            }

            await loadData();
            if (!silent) {
                alert.success(`刷新成功，新增 ${addedCount} 个模型`);
            }
        } catch (err) {
            console.error('Failed to refresh models:', err);
            if (!silent) {
                alert.error('获取模型列表失败');
            }
        } finally {
            refreshing.value = false;
        }
    };

    onMounted(() => {
        loadData();
    });
</script>

<template>
    <div class="flex h-screen w-screen bg-gray-100">
        <!-- Loading State -->
        <div v-if="loading" class="flex flex-1 items-center justify-center">
            <div
                class="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
            ></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex flex-1 items-center justify-center">
            <div class="rounded-lg bg-red-50 p-6 text-red-600">
                <p class="font-semibold">加载失败</p>
                <p class="text-sm">{{ error }}</p>
                <button
                    class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                    @click="loadData"
                >
                    重试
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <template v-else>
            <!-- Left: Provider List -->
            <ProviderList
                :providers="providers"
                :selected-provider-id="selectedProviderId"
                :default-model-provider-ids="defaultModelProviderIds"
                @select="selectProvider"
                @toggle-enabled="toggleProviderEnabled"
                @add-custom="handleAddCustomProvider"
                @validation-error="handleValidationError"
            />

            <!-- Right: Provider Detail -->
            <div v-if="selectedProvider" class="custom-scrollbar flex-1 overflow-y-auto p-6">
                <div class="mx-auto max-w-4xl space-y-6">
                    <!-- Provider Header -->
                    <div class="rounded-lg border border-gray-200 bg-white p-6">
                        <div class="flex items-center gap-4">
                            <!-- Logo -->
                            <img
                                v-if="getLogoUrl(selectedProvider.logo)"
                                :src="getLogoUrl(selectedProvider.logo)"
                                :alt="selectedProvider.name"
                                class="h-16 w-16 rounded-lg object-contain"
                            />
                            <div
                                v-else
                                class="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200 text-2xl font-bold text-gray-600"
                            >
                                {{ selectedProvider.name.charAt(0) }}
                            </div>

                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <h2 class="text-2xl font-bold text-gray-900">
                                        {{ selectedProvider.name }}
                                    </h2>
                                    <span
                                        v-if="selectedProvider.is_builtin"
                                        class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                                    >
                                        内置
                                    </span>
                                </div>
                                <div class="mt-2">
                                    <span
                                        class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                                        :class="
                                            selectedProvider.type === 'openai'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-purple-100 text-purple-800'
                                        "
                                    >
                                        {{
                                            selectedProvider.type === 'openai' ? 'OpenAI' : 'Claude'
                                        }}
                                    </span>
                                </div>
                            </div>
                            <button
                                v-if="!selectedProvider.is_builtin"
                                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                                @click="handleDeleteProvider(selectedProvider.id)"
                            >
                                删除服务商
                            </button>
                        </div>
                    </div>

                    <!-- Provider Config -->
                    <ProviderConfig :provider="selectedProvider" @update="handleUpdateProvider" />

                    <!-- Model List -->
                    <ModelList
                        :provider-id="selectedProvider.id"
                        :models="selectedProviderModels"
                        :default-model-id="defaultModelId"
                        :provider="selectedProvider"
                        @create="handleCreateModel"
                        @update="handleUpdateModel"
                        @delete="handleDeleteModel"
                        @set-default="handleSetDefaultModel"
                        @refresh="handleRefreshModels"
                    />
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="flex flex-1 items-center justify-center">
                <div class="text-center">
                    <p class="text-lg text-gray-600">请选择一个服务商</p>
                </div>
            </div>
        </template>

        <!-- Add Provider Dialog -->
        <AddProviderDialog
            v-if="showAddDialog"
            @create="handleCreateProvider"
            @cancel="showAddDialog = false"
        />
    </div>
</template>
