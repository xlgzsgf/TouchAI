<script setup lang="ts">
    import ConfirmDialog from '@components/common/ConfirmDialog.vue';
    import SvgIcon from '@components/common/SvgIcon.vue';
    import {
        countAiRequests,
        countMessages,
        countSessions,
        deleteAllAiRequests,
        deleteAllMessages,
        deleteAllSessions,
    } from '@database/queries';
    import { updateModelMetadata } from '@utils/modelMetadata';
    import { onMounted, ref } from 'vue';

    interface DataStats {
        sessions: number;
        messages: number;
        aiRequests: number;
    }

    const stats = ref<DataStats>({
        sessions: 0,
        messages: 0,
        aiRequests: 0,
    });

    const showConfirmDialog = ref(false);
    const confirmDialogTitle = ref('');
    const confirmDialogMessage = ref('');
    const confirmDialogAction = ref<(() => Promise<void>) | null>(null);

    const isLoading = ref(false);
    const errorMessage = ref('');
    const successMessage = ref('');

    const loadStats = async () => {
        try {
            const [sessionsCount, messagesCount, aiRequestsCount] = await Promise.all([
                countSessions(),
                countMessages(),
                countAiRequests(),
            ]);

            stats.value = {
                sessions: sessionsCount,
                messages: messagesCount,
                aiRequests: aiRequestsCount,
            };
        } catch (error) {
            console.error('Failed to load stats:', error);
            errorMessage.value = '加载统计数据失败';
        }
    };

    onMounted(() => {
        loadStats();
    });

    const showConfirm = (title: string, message: string, action: () => Promise<void>) => {
        confirmDialogTitle.value = title;
        confirmDialogMessage.value = message;
        confirmDialogAction.value = action;
        showConfirmDialog.value = true;
    };

    const handleConfirm = async () => {
        if (confirmDialogAction.value) {
            await confirmDialogAction.value();
        }
        showConfirmDialog.value = false;
    };

    const handleClearSessions = async () => {
        showConfirm(
            '清除所有对话历史',
            '此操作将删除所有对话会话及其消息，且无法恢复。确定要继续吗？',
            async () => {
                try {
                    isLoading.value = true;
                    errorMessage.value = '';
                    successMessage.value = '';

                    const deletedCount = await deleteAllSessions();
                    successMessage.value = `已成功删除 ${deletedCount} 个会话`;
                    await loadStats();
                } catch (error) {
                    console.error('Failed to clear sessions:', error);
                    errorMessage.value = '清除对话历史失败';
                } finally {
                    isLoading.value = false;
                }
            }
        );
    };

    const handleClearMessages = async () => {
        showConfirm(
            '清除所有消息',
            '此操作将删除所有消息记录，但保留会话。确定要继续吗？',
            async () => {
                try {
                    isLoading.value = true;
                    errorMessage.value = '';
                    successMessage.value = '';

                    const deletedCount = await deleteAllMessages();
                    successMessage.value = `已成功删除 ${deletedCount} 条消息`;
                    await loadStats();
                } catch (error) {
                    console.error('Failed to clear messages:', error);
                    errorMessage.value = '清除消息失败';
                } finally {
                    isLoading.value = false;
                }
            }
        );
    };

    const handleClearAiRequests = async () => {
        showConfirm('清除AI请求记录', '此操作将删除所有AI请求记录。确定要继续吗？', async () => {
            try {
                isLoading.value = true;
                errorMessage.value = '';
                successMessage.value = '';

                const deletedCount = await deleteAllAiRequests();
                successMessage.value = `已成功删除 ${deletedCount} 条AI请求记录`;
                await loadStats();
            } catch (error) {
                console.error('Failed to clear AI requests:', error);
                errorMessage.value = '清除AI请求记录失败';
            } finally {
                isLoading.value = false;
            }
        });
    };

    const handleExportSettings = async () => {
        try {
            isLoading.value = true;
            errorMessage.value = '';
            successMessage.value = '';

            // TODO: Implement export settings functionality
            successMessage.value = '导出设置功能即将推出';
        } catch (error) {
            console.error('Failed to export settings:', error);
            errorMessage.value = '导出设置失败';
        } finally {
            isLoading.value = false;
        }
    };

    const handleImportSettings = async () => {
        try {
            isLoading.value = true;
            errorMessage.value = '';
            successMessage.value = '';

            // TODO: Implement import settings functionality
            successMessage.value = '导入设置功能即将推出';
        } catch (error) {
            console.error('Failed to import settings:', error);
            errorMessage.value = '导入设置失败';
        } finally {
            isLoading.value = false;
        }
    };

    const handleUpdateModelMetadata = async () => {
        try {
            isLoading.value = true;
            errorMessage.value = '';
            successMessage.value = '';

            await updateModelMetadata();
            successMessage.value = '大模型数据库已更新';
        } catch (error) {
            console.error('Failed to update model metadata:', error);
            errorMessage.value = '更新大模型数据库失败';
        } finally {
            isLoading.value = false;
        }
    };
</script>

<template>
    <div class="p-6">
        <div class="mx-auto max-w-4xl space-y-6">
            <div class="rounded-lg border border-gray-200 bg-white p-6">
                <div class="flex items-center gap-4">
                    <div
                        class="bg-primary-50 text-primary-600 flex h-16 w-16 items-center justify-center rounded-lg"
                    >
                        <SvgIcon name="database" class="h-6 w-6" />
                    </div>

                    <div class="flex-1">
                        <h2 class="font-serif text-xl font-semibold text-gray-900">数据管理</h2>
                        <p class="mt-1 font-serif text-sm text-gray-600">管理应用数据和设置备份</p>
                    </div>
                </div>
            </div>

            <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4">
                <p class="font-serif text-sm text-red-800">{{ errorMessage }}</p>
            </div>
            <div v-if="successMessage" class="rounded-lg border border-green-200 bg-green-50 p-4">
                <p class="font-serif text-sm text-green-800">{{ successMessage }}</p>
            </div>

            <div class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                <h2 class="font-serif text-lg font-semibold text-gray-900">数据统计</h2>
                <div class="grid grid-cols-3 gap-4">
                    <div class="rounded-lg bg-gray-50 p-4 text-center">
                        <div class="text-primary-600 font-serif text-3xl font-bold">
                            {{ stats.sessions }}
                        </div>
                        <div class="mt-1 font-serif text-sm text-gray-600">对话会话数</div>
                    </div>
                    <div class="rounded-lg bg-gray-50 p-4 text-center">
                        <div class="text-primary-600 font-serif text-3xl font-bold">
                            {{ stats.messages }}
                        </div>
                        <div class="mt-1 font-serif text-sm text-gray-600">消息总数</div>
                    </div>
                    <div class="rounded-lg bg-gray-50 p-4 text-center">
                        <div class="text-primary-600 font-serif text-3xl font-bold">
                            {{ stats.aiRequests }}
                        </div>
                        <div class="mt-1 font-serif text-sm text-gray-600">AI请求次数</div>
                    </div>
                </div>
            </div>

            <div class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                <h2 class="font-serif text-lg font-semibold text-gray-900">历史记录</h2>
                <div class="space-y-3">
                    <div class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div>
                            <div class="font-serif text-sm font-medium text-gray-900">
                                清除所有对话历史
                            </div>
                            <div class="mt-1 font-serif text-xs text-gray-500">
                                删除所有会话及其消息，此操作不可恢复
                            </div>
                        </div>
                        <button
                            class="rounded-lg bg-red-600 px-4 py-2 font-serif text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isLoading || stats.sessions === 0"
                            @click="handleClearSessions"
                        >
                            清除
                        </button>
                    </div>

                    <div class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div>
                            <div class="font-serif text-sm font-medium text-gray-900">
                                清除所有消息
                            </div>
                            <div class="mt-1 font-serif text-xs text-gray-500">
                                删除所有消息记录，但保留会话
                            </div>
                        </div>
                        <button
                            class="rounded-lg bg-red-600 px-4 py-2 font-serif text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isLoading || stats.messages === 0"
                            @click="handleClearMessages"
                        >
                            清除
                        </button>
                    </div>

                    <div class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div>
                            <div class="font-serif text-sm font-medium text-gray-900">
                                清除AI请求记录
                            </div>
                            <div class="mt-1 font-serif text-xs text-gray-500">
                                删除所有AI请求历史记录
                            </div>
                        </div>
                        <button
                            class="rounded-lg bg-red-600 px-4 py-2 font-serif text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isLoading || stats.aiRequests === 0"
                            @click="handleClearAiRequests"
                        >
                            清除
                        </button>
                    </div>
                </div>
            </div>

            <div class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                <h2 class="font-serif text-lg font-semibold text-gray-900">数据更新</h2>
                <div class="space-y-3">
                    <div class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div>
                            <div class="font-serif text-sm font-medium text-gray-900">
                                大模型数据库
                            </div>
                            <div class="mt-1 font-serif text-xs text-gray-500">
                                从远程源同步最新的大模型元数据
                            </div>
                        </div>
                        <button
                            class="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 font-serif text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isLoading"
                            @click="handleUpdateModelMetadata"
                        >
                            更新
                        </button>
                    </div>
                </div>
            </div>

            <div class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
                <h2 class="font-serif text-lg font-semibold text-gray-900">设置备份</h2>
                <div class="space-y-3">
                    <div class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div>
                            <div class="font-serif text-sm font-medium text-gray-900">导出设置</div>
                            <div class="mt-1 font-serif text-xs text-gray-500">
                                将当前设置导出为JSON文件
                            </div>
                        </div>
                        <button
                            class="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 font-serif text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isLoading"
                            @click="handleExportSettings"
                        >
                            导出
                        </button>
                    </div>

                    <div class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div>
                            <div class="font-serif text-sm font-medium text-gray-900">导入设置</div>
                            <div class="mt-1 font-serif text-xs text-gray-500">
                                从JSON文件导入设置
                            </div>
                        </div>
                        <button
                            class="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 font-serif text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="isLoading"
                            @click="handleImportSettings"
                        >
                            导入
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                v-if="showConfirmDialog"
                :title="confirmDialogTitle"
                :message="confirmDialogMessage"
                confirm-text="确定"
                cancel-text="取消"
                @confirm="handleConfirm"
                @cancel="showConfirmDialog = false"
            />
        </div>
    </div>
</template>
