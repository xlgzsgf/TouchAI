<template>
    <div class="flex h-screen w-screen flex-col bg-white p-6">
        <!-- 头部 -->
        <div class="mb-6 flex items-center justify-between">
            <h1 class="text-2xl font-bold text-gray-800">模型管理</h1>
            <button
                class="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
                @click="startCreate"
            >
                + 新增模型
            </button>
        </div>

        <!-- 模型列表 -->
        <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div
                    class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
                ></div>
            </div>

            <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-600">
                <p class="font-semibold">加载失败</p>
                <p class="text-sm">{{ error }}</p>
            </div>

            <div v-else class="space-y-4">
                <!-- 新增模型表单 -->
                <div
                    v-if="isCreating"
                    class="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 shadow-sm"
                >
                    <h3 class="mb-4 text-lg font-semibold text-gray-800">新增模型</h3>
                    <div class="space-y-3">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">
                                模型名称 *
                            </label>
                            <input
                                v-model="createForm.name"
                                type="text"
                                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="例如: GPT-4"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">
                                模型ID *
                            </label>
                            <input
                                v-model="createForm.model_id"
                                type="text"
                                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="例如: gpt-4"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">
                                模型类型 *
                            </label>
                            <select
                                v-model="createForm.type"
                                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            >
                                <option value="openai">OpenAI</option>
                                <option value="claude">Claude</option>
                                <option value="ollama">Ollama</option>
                            </select>
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">描述</label>
                            <textarea
                                v-model="createForm.description"
                                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                rows="2"
                                placeholder="模型描述"
                            ></textarea>
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">
                                API端点
                            </label>
                            <input
                                v-model="createForm.api_endpoint"
                                type="text"
                                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="https://api.example.com/v1"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">
                                API密钥
                            </label>
                            <input
                                v-model="createForm.api_key"
                                type="password"
                                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="sk-..."
                            />
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="mb-1 block text-sm font-medium text-gray-700">
                                    最大Token数
                                </label>
                                <input
                                    v-model.number="createForm.max_tokens"
                                    type="number"
                                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="4096"
                                />
                            </div>
                            <div>
                                <label class="mb-1 block text-sm font-medium text-gray-700">
                                    温度 (0-2)
                                </label>
                                <input
                                    v-model.number="createForm.temperature"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="2"
                                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="0.7"
                                />
                            </div>
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-gray-700">
                                优先级
                            </label>
                            <input
                                v-model.number="createForm.priority"
                                type="number"
                                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="100"
                            />
                        </div>
                    </div>
                    <div class="mt-4 flex gap-2">
                        <button
                            class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                            @click="saveCreate"
                        >
                            保存
                        </button>
                        <button
                            class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                            @click="cancelCreate"
                        >
                            取消
                        </button>
                    </div>
                </div>

                <!-- 模型列表 -->
                <div
                    v-for="model in models"
                    :key="model.id"
                    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="mb-2 flex items-center gap-3">
                                <h3 class="text-lg font-semibold text-gray-800">
                                    {{ model.name }}
                                </h3>
                                <span
                                    class="rounded-full px-2 py-1 text-xs font-medium"
                                    :class="getTypeClass(model.type)"
                                >
                                    {{ getTypeLabel(model.type) }}
                                </span>
                                <span
                                    class="rounded-full px-2 py-1 text-xs font-medium"
                                    :class="
                                        model.enabled
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-600'
                                    "
                                >
                                    {{ model.enabled ? '已启用' : '已禁用' }}
                                </span>
                            </div>

                            <p class="mb-2 text-sm text-gray-600">{{ model.description }}</p>

                            <div class="mb-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>
                                    <span class="font-medium">模型ID:</span>
                                    {{ model.model_id }}
                                </div>
                                <div>
                                    <span class="font-medium">优先级:</span>
                                    {{ model.priority }}
                                </div>
                                <div class="col-span-2">
                                    <span class="font-medium">API端点:</span>
                                    {{ model.api_endpoint || '未配置' }}
                                </div>
                                <div class="col-span-2">
                                    <span class="font-medium">API密钥:</span>
                                    {{ model.api_key ? '已配置' : '未配置' }}
                                </div>
                                <div v-if="model.last_used_at">
                                    <span class="font-medium">最后使用:</span>
                                    {{ formatDate(model.last_used_at) }}
                                </div>
                            </div>

                            <!-- 编辑表单 -->
                            <div v-if="editingId === model.id" class="mt-4 space-y-3 border-t pt-4">
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">
                                        模型名称
                                    </label>
                                    <input
                                        v-model="editForm.name"
                                        type="text"
                                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="例如: GPT-4"
                                    />
                                </div>
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">
                                        模型ID
                                    </label>
                                    <input
                                        v-model="editForm.model_id"
                                        type="text"
                                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="例如: gpt-4"
                                    />
                                </div>
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">
                                        描述
                                    </label>
                                    <textarea
                                        v-model="editForm.description"
                                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        rows="2"
                                        placeholder="模型描述"
                                    ></textarea>
                                </div>
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">
                                        API端点
                                    </label>
                                    <input
                                        v-model="editForm.api_endpoint"
                                        type="text"
                                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="https://api.example.com/v1"
                                    />
                                </div>
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">
                                        API密钥
                                    </label>
                                    <input
                                        v-model="editForm.api_key"
                                        type="password"
                                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="sk-..."
                                    />
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="mb-1 block text-sm font-medium text-gray-700">
                                            最大Token数
                                        </label>
                                        <input
                                            v-model.number="editForm.max_tokens"
                                            type="number"
                                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder="4096"
                                        />
                                    </div>
                                    <div>
                                        <label class="mb-1 block text-sm font-medium text-gray-700">
                                            温度 (0-2)
                                        </label>
                                        <input
                                            v-model.number="editForm.temperature"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="2"
                                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder="0.7"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">
                                        优先级
                                    </label>
                                    <input
                                        v-model.number="editForm.priority"
                                        type="number"
                                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="mt-4 flex gap-2">
                        <button
                            v-if="editingId !== model.id"
                            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                            :class="
                                model.enabled
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            "
                            @click="toggleEnabled(model)"
                        >
                            {{ model.enabled ? '禁用' : '启用' }}
                        </button>
                        <button
                            v-if="editingId !== model.id"
                            class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                            @click="startEdit(model)"
                        >
                            编辑
                        </button>
                        <button
                            v-if="editingId !== model.id"
                            class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                            @click="deleteModelConfirm(model)"
                        >
                            删除
                        </button>
                        <button
                            v-if="editingId === model.id"
                            class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                            @click="saveEdit(model.id)"
                        >
                            保存
                        </button>
                        <button
                            v-if="editingId === model.id"
                            class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                            @click="cancelEdit"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { onMounted, ref } from 'vue';

    import { createModel, deleteModel, findAllModels, updateModel } from '@/database/queries';
    import type { Model, ModelUpdate, NewModel } from '@/database/schema';

    const models = ref<Model[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const editingId = ref<number | null>(null);
    const editForm = ref<Partial<ModelUpdate>>({});
    const isCreating = ref(false);
    const createForm = ref<Partial<NewModel>>({
        name: '',
        model_id: '',
        type: 'openai',
        description: '',
        api_endpoint: '',
        api_key: '',
        max_tokens: undefined,
        temperature: undefined,
        priority: 100,
        enabled: 1,
    });

    async function loadModels() {
        try {
            loading.value = true;
            error.value = null;
            models.value = await findAllModels();
        } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
        } finally {
            loading.value = false;
        }
    }

    async function toggleEnabled(model: Model) {
        try {
            await updateModel(model.id, { enabled: model.enabled ? 0 : 1 });
            await loadModels();
        } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
        }
    }

    function startEdit(model: Model) {
        editingId.value = model.id;
        editForm.value = {
            name: model.name,
            model_id: model.model_id,
            description: model.description || '',
            api_endpoint: model.api_endpoint || '',
            api_key: model.api_key || '',
            max_tokens: model.max_tokens || undefined,
            temperature: model.temperature || undefined,
            priority: model.priority,
        };
    }

    async function saveEdit(modelId: number) {
        try {
            await updateModel(modelId, editForm.value);
            editingId.value = null;
            editForm.value = {};
            await loadModels();
        } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
        }
    }

    function cancelEdit() {
        editingId.value = null;
        editForm.value = {};
    }

    function startCreate() {
        isCreating.value = true;
        createForm.value = {
            name: '',
            model_id: '',
            type: 'openai',
            description: '',
            api_endpoint: '',
            api_key: '',
            max_tokens: undefined,
            temperature: undefined,
            priority: 100,
            enabled: 1,
        };
    }

    async function saveCreate() {
        try {
            if (!createForm.value.name || !createForm.value.model_id || !createForm.value.type) {
                error.value = '模型名称、模型ID和类型为必填项';
                return;
            }

            await createModel(createForm.value as NewModel);
            isCreating.value = false;
            createForm.value = {};
            await loadModels();
        } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
        }
    }

    function cancelCreate() {
        isCreating.value = false;
        createForm.value = {};
    }

    async function deleteModelConfirm(model: Model) {
        if (confirm(`确定要删除模型 "${model.name}" 吗？此操作不可恢复。`)) {
            try {
                await deleteModel(model.id);
                await loadModels();
            } catch (e) {
                error.value = e instanceof Error ? e.message : String(e);
            }
        }
    }

    function getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            openai: 'OpenAI',
            claude: 'Claude',
            ollama: 'Ollama',
        };
        return labels[type] || type;
    }

    function getTypeClass(type: string): string {
        const classes: Record<string, string> = {
            openai: 'bg-purple-100 text-purple-700',
            claude: 'bg-orange-100 text-orange-700',
            ollama: 'bg-blue-100 text-blue-700',
        };
        return classes[type] || 'bg-gray-100 text-gray-700';
    }

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN');
    }

    onMounted(() => {
        loadModels();
    });
</script>
