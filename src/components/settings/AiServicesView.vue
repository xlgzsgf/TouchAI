<!-- Copyright (c) 2025. 千诚. Licensed under GPL v3 -->

<script setup lang="ts">
    import SvgIcon from '@components/common/SvgIcon.vue';
    import AddProviderDialog from '@components/settings/AddProviderDialog.vue';
    import BadgedLogo from '@components/settings/BadgedLogo.vue';
    import EditProviderDialog from '@components/settings/EditProviderDialog.vue';
    import ModelList from '@components/settings/ModelList.vue';
    import ProviderConfig from '@components/settings/ProviderConfig.vue';
    import ProviderContextMenu from '@components/settings/ProviderContextMenu.vue';
    import ProviderList from '@components/settings/ProviderList.vue';
    import { useAlert } from '@composables/useAlert';
    import {
        createModel,
        createModels,
        createProvider,
        deleteModel,
        deleteProvider,
        findAllProvidersSorted,
        findDefaultModel,
        findModelsWithProvider,
        findProviderById,
        setDefaultModel,
        updateModel,
        updateProvider,
    } from '@database/queries';
    import type { ModelWithProviderAndMetadata } from '@database/queries/models';
    import type { Model, NewModel, NewProvider, Provider } from '@database/schema';
    import { aiService } from '@services/ai/manager';
    import { computed, onMounted, ref } from 'vue';

    const alert = useAlert();

    const providers = ref<Provider[]>([]);
    const modelsCache = ref<Map<number, ModelWithProviderAndMetadata[]>>(new Map()); // 缓存每个服务商的模型
    const selectedProviderId = ref<number | null>(null);
    const defaultModelId = ref<number | null>(null);
    const defaultModelProviderId = ref<number | null>(null);
    const loading = ref(true);
    const loadingModels = ref(false);
    const error = ref<string | null>(null);
    const showAddDialog = ref(false);
    const showEditDialog = ref(false);
    const refreshing = ref(false);
    const refreshingProviderId = ref<number | null>(null);

    // 右键菜单状态
    const contextMenu = ref<{
        show: boolean;
        x: number;
        y: number;
        providerId: number | null;
    }>({
        show: false,
        x: 0,
        y: 0,
        providerId: null,
    });

    // 计算属性
    const selectedProvider = computed(() =>
        providers.value.find((p) => p.id === selectedProviderId.value)
    );

    const selectedProviderModels = computed(() => {
        if (!selectedProviderId.value) return [];
        return modelsCache.value.get(selectedProviderId.value) || [];
    });

    const defaultModelProviderIds = computed(() => {
        const ids = new Set<number>();
        if (defaultModelProviderId.value !== null) {
            ids.add(defaultModelProviderId.value);
            return ids;
        }
        return ids;
    });

    // 加载服务商列表
    const loadProviders = async () => {
        try {
            loading.value = true;
            error.value = null;

            providers.value = await findAllProvidersSorted();

            const defaultModel = await findDefaultModel();
            defaultModelId.value = defaultModel?.id || null;
            defaultModelProviderId.value = defaultModel?.provider_id || null;

            // 自动选择第一个服务商
            if (providers.value.length > 0 && !selectedProviderId.value) {
                selectedProviderId.value = providers.value[0]?.id || null;
                if (selectedProviderId.value) {
                    await loadModelsForProvider(selectedProviderId.value);
                }
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : '加载失败';
            console.error('Failed to load providers:', err);
        } finally {
            loading.value = false;
        }
    };

    // 加载指定服务商的模型（带缓存）
    const loadModelsForProvider = async (providerId: number, forceReload = false) => {
        // 如果缓存中已有数据且不强制刷新，直接返回
        if (!forceReload && modelsCache.value.has(providerId)) {
            return;
        }

        try {
            loadingModels.value = true;
            const models = await findModelsWithProvider(providerId);
            modelsCache.value.set(providerId, models);
        } catch (err) {
            console.error('Failed to load models:', err);
            alert.error('加载模型失败');
        } finally {
            loadingModels.value = false;
        }
    };

    // 服务商操作
    const selectProvider = async (providerId: number) => {
        if (refreshing.value) {
            refreshing.value = false;
            refreshingProviderId.value = null;
        }

        selectedProviderId.value = providerId;

        // 加载该服务商的模型（使用缓存）
        await loadModelsForProvider(providerId);
    };

    const toggleProviderEnabled = async (providerId: number) => {
        try {
            const provider = providers.value.find((p) => p.id === providerId);
            if (!provider) return;

            const newEnabled = provider.enabled === 1 ? 0 : 1;
            await updateProvider(providerId, { enabled: newEnabled });

            // 重新加载服务商列表
            await loadProviders();

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

    const handleProviderContextMenu = (providerId: number, event: MouseEvent) => {
        contextMenu.value = {
            show: true,
            x: event.clientX,
            y: event.clientY,
            providerId,
        };
    };

    const handleContextMenuEdit = () => {
        if (contextMenu.value.providerId) {
            selectedProviderId.value = contextMenu.value.providerId;
            showEditDialog.value = true;
        }
    };

    const handleContextMenuDelete = () => {
        if (contextMenu.value.providerId) {
            handleDeleteProvider(contextMenu.value.providerId);
        }
    };

    const closeContextMenu = () => {
        contextMenu.value.show = false;
    };

    const handleUpdateProvider = async (data: Partial<Provider>) => {
        if (!selectedProviderId.value) return;

        try {
            await updateProvider(selectedProviderId.value, data);
            aiService.clearProviderCache(selectedProviderId.value);
            await loadProviders();
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleAddCustomProvider = () => {
        showAddDialog.value = true;
    };

    const handleEditProvider = () => {
        showEditDialog.value = true;
    };

    const handleCreateProvider = async (data: NewProvider) => {
        try {
            await createProvider(data);
            await loadProviders();
            showAddDialog.value = false;
            alert.success('创建成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '创建失败');
        }
    };

    const handleUpdateProviderInfo = async (data: Partial<Provider>) => {
        if (!selectedProviderId.value) return;

        try {
            await updateProvider(selectedProviderId.value, data);
            aiService.clearProviderCache(selectedProviderId.value);
            await loadProviders();
            showEditDialog.value = false;
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleDeleteProvider = async (providerId: number) => {
        try {
            await deleteProvider(providerId);
            await loadProviders();
            if (selectedProviderId.value === providerId) {
                selectedProviderId.value = providers.value[0]?.id || null;
                if (selectedProviderId.value) {
                    await loadModelsForProvider(selectedProviderId.value);
                }
            }
            showEditDialog.value = false;
            alert.success('删除成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '删除失败');
        }
    };

    // 模型操作
    const handleCreateModel = async (data: NewModel) => {
        try {
            await createModel(data);
            if (selectedProviderId.value) {
                await loadModelsForProvider(selectedProviderId.value, true); // 强制刷新
            }
            alert.success('创建成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '创建失败');
        }
    };

    const handleUpdateModel = async (id: number, data: Partial<Model>) => {
        try {
            await updateModel(id, data);
            aiService.clearProviderCache();
            if (selectedProviderId.value) {
                await loadModelsForProvider(selectedProviderId.value, true); // 强制刷新
            }
            alert.success('保存成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '保存失败');
        }
    };

    const handleDeleteModel = async (id: number, silent = false) => {
        try {
            await deleteModel(id);
            if (selectedProviderId.value) {
                await loadModelsForProvider(selectedProviderId.value, true); // 强制刷新
            }
            if (!silent) {
                alert.success('删除成功');
            }
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '删除失败');
        }
    };

    const handleSetDefaultModel = async (id: number) => {
        try {
            await setDefaultModel(id);
            await loadProviders();

            // 强制刷新模型列表以确保排序正确
            if (selectedProviderId.value) {
                await loadModelsForProvider(selectedProviderId.value, true);
            }

            alert.success('设置成功');
        } catch (err) {
            alert.error(err instanceof Error ? err.message : '设置失败');
        }
    };

    // 刷新模型列表
    const handleRefreshModels = async (silent = false) => {
        if (!selectedProviderId.value) return;

        const currentProviderId = selectedProviderId.value;
        refreshingProviderId.value = currentProviderId;

        try {
            refreshing.value = true;
            const provider = await findProviderById(currentProviderId);
            if (!provider) {
                if (!silent) alert.error('服务商不存在');
                return;
            }

            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            // 如果有 API key 就直接用，没有就用占位符（部分厂商支持无key获取模型列表）
            const apiKey = provider.api_key || 'placeholder_for_models';
            const providerInstance = aiService.createProviderInstance(
                provider.type,
                provider.api_endpoint,
                apiKey
            );

            let fetchedModels;
            try {
                fetchedModels = await providerInstance.listModels();
            } catch (error) {
                if (refreshingProviderId.value !== currentProviderId) {
                    return;
                }

                const errorMessage = error instanceof Error ? error.message : String(error);
                const isAuthError =
                    errorMessage.includes('401') ||
                    errorMessage.includes('403') ||
                    errorMessage.includes('Unauthorized') ||
                    errorMessage.includes('authentication') ||
                    errorMessage.includes('API key');

                // 如果是认证错误且没有配置 key，提示用户
                if (isAuthError && !provider.api_key) {
                    if (!silent) {
                        alert.warning('该服务商需要配置 API Key 才能获取模型列表');
                    }
                    return;
                }

                // 其他错误直接抛出
                throw error;
            }

            // 避免展示错误
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            if (fetchedModels.length === 0) {
                if (!silent) alert.info('未获取到模型列表');
                return;
            }

            const existingModels = await findModelsWithProvider(provider.id);
            const existingModelIds = new Set(existingModels.map((m) => m.model_id));

            const newModels = fetchedModels
                .filter((fetchedModel) => !existingModelIds.has(fetchedModel.id))
                .map((fetchedModel) => ({
                    provider_id: provider.id,
                    name: fetchedModel.name,
                    model_id: fetchedModel.id,
                    is_default: 0,
                }));

            // 避免展示错误
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            if (newModels.length > 0) {
                await createModels(newModels);
            }

            // 避免展示错误
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            await loadModelsForProvider(currentProviderId, true); // 强制刷新缓存
            if (!silent) {
                alert.success(`刷新成功，新增 ${newModels.length} 个模型`);
            }
        } catch (err) {
            if (refreshingProviderId.value !== currentProviderId) {
                return;
            }

            console.error('Failed to refresh models:', err);
            if (!silent) {
                alert.error(`获取模型列表失败:${err}`);
            }
        } finally {
            if (refreshingProviderId.value === currentProviderId) {
                refreshing.value = false;
                refreshingProviderId.value = null;
            }
        }
    };

    onMounted(() => {
        loadProviders();
    });
</script>

<template>
    <div class="flex h-full">
        <ProviderList
            :providers="providers"
            :selected-provider-id="selectedProviderId"
            :default-model-provider-ids="defaultModelProviderIds"
            @select="selectProvider"
            @toggle-enabled="toggleProviderEnabled"
            @add-custom="handleAddCustomProvider"
            @validation-error="handleValidationError"
            @context-menu="handleProviderContextMenu"
        />

        <div class="custom-scrollbar flex-1 overflow-y-auto">
            <div v-if="loading" class="flex h-full items-center justify-center">
                <div
                    class="border-primary-100 border-t-primary-500 h-10 w-10 animate-spin rounded-full border-3"
                ></div>
            </div>

            <div v-else-if="error" class="flex h-full items-center justify-center">
                <div class="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
                    <p class="font-medium text-gray-900">加载失败</p>
                    <p class="mt-1 text-sm">{{ error }}</p>
                    <button
                        class="bg-primary-500 hover:bg-primary-600 mt-4 rounded-lg px-4 py-2 text-sm text-white transition-colors"
                        @click="() => loadProviders()"
                    >
                        重试
                    </button>
                </div>
            </div>

            <div v-else-if="selectedProvider" class="p-6">
                <div class="mx-auto max-w-4xl space-y-6">
                    <div class="rounded-lg border border-gray-200 bg-white p-6">
                        <div class="flex items-center gap-4">
                            <BadgedLogo
                                :logo="selectedProvider.logo"
                                :name="selectedProvider.name"
                                size="large"
                                :show-badge="selectedProvider.is_builtin === 1"
                            />

                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <h2 class="font-serif text-xl font-semibold text-gray-900">
                                        {{ selectedProvider.name }}
                                    </h2>
                                    <span
                                        class="bg-primary-50 text-primary-600 rounded-full px-2 py-0.5 text-xs font-medium"
                                    >
                                        {{
                                            selectedProvider.type === 'openai'
                                                ? 'OpenAI'
                                                : 'Anthropic'
                                        }}
                                    </span>
                                </div>
                            </div>
                            <button
                                v-if="!selectedProvider.is_builtin"
                                class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                title="编辑服务商"
                                @click="handleEditProvider"
                            >
                                <SvgIcon name="edit" class="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <ProviderConfig :provider="selectedProvider" @update="handleUpdateProvider" />

                    <ModelList
                        :provider-id="selectedProvider.id"
                        :models="selectedProviderModels"
                        :default-model-id="defaultModelId"
                        :provider="selectedProvider"
                        :provider-enabled="selectedProvider.enabled === 1"
                        :refreshing="refreshing"
                        @create="handleCreateModel"
                        @update="handleUpdateModel"
                        @delete="handleDeleteModel"
                        @set-default="handleSetDefaultModel"
                        @refresh="handleRefreshModels"
                    />
                </div>
            </div>
        </div>

        <AddProviderDialog
            v-if="showAddDialog"
            @create="handleCreateProvider"
            @cancel="showAddDialog = false"
        />

        <EditProviderDialog
            v-if="showEditDialog && selectedProvider"
            :provider="selectedProvider"
            @update="handleUpdateProviderInfo"
            @cancel="showEditDialog = false"
        />

        <ProviderContextMenu
            v-if="contextMenu.show"
            :x="contextMenu.x"
            :y="contextMenu.y"
            @edit="handleContextMenuEdit"
            @delete="handleContextMenuDelete"
            @close="closeContextMenu"
        />
    </div>
</template>
