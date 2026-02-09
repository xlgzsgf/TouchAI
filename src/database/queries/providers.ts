// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { and, desc, eq } from 'drizzle-orm';

import { db } from '../index';
import type { NewProvider, Provider, ProviderUpdate } from '../schema';
import { models, providers } from '../schema';

/**
 * 查找所有服务商，按优先级排序
 * 排序规则：
 * 1. 启用的服务商排在前面
 * 2. 启用的服务商中，有默认模型的排在最前面
 * 3. 其他按 ID 排序
 */
export const findAllProvidersSorted = async () => {
    const drizzle = await db.getDb();
    const allProviders = await drizzle.select().from(providers).all();
    const allModels = await drizzle.select().from(models).all();

    // 找出有默认模型的服务商 ID
    const defaultModelProviderId = allModels.find((m) => m.is_default === 1)?.provider_id;

    // 排序
    return allProviders.sort((a, b) => {
        // 1. 启用的排前面
        if (a.enabled !== b.enabled) {
            return b.enabled - a.enabled;
        }

        // 2. 启用的服务商中，有默认模型的排最前面
        if (a.enabled === 1) {
            const aHasDefault = a.id === defaultModelProviderId ? 1 : 0;
            const bHasDefault = b.id === defaultModelProviderId ? 1 : 0;
            if (aHasDefault !== bHasDefault) {
                return bHasDefault - aHasDefault;
            }
        }

        // 3. 其他按 ID 排序
        return a.id - b.id;
    });
};

/**
 * 根据 ID 查找服务商
 */
export const findProviderById = async (id: number) =>
    (await db.getDb()).select().from(providers).where(eq(providers.id, id)).get();

/**
 * 查找所有启用的服务商
 */
export const findEnabledProviders = async () =>
    (await db.getDb()).select().from(providers).where(eq(providers.enabled, 1)).all();

/**
 * 查找所有内置服务商
 */
export const findBuiltinProviders = async () =>
    (await db.getDb()).select().from(providers).where(eq(providers.is_builtin, 1)).all();

/**
 * 创建服务商
 */
export const createProvider = async (data: NewProvider): Promise<Provider> => {
    const drizzle = await db.getDb();
    await drizzle.insert(providers).values(data).run();

    const lastInsert = await drizzle
        .select()
        .from(providers)
        .orderBy(desc(providers.id))
        .limit(1)
        .get();

    if (!lastInsert) {
        throw new Error('Failed to create provider');
    }
    return lastInsert;
};

/**
 * 更新服务商
 * 验证：如果服务商有默认模型，则不能禁用
 */
export const updateProvider = async (id: number, data: ProviderUpdate): Promise<void> => {
    // 如果尝试禁用服务商，检查是否有默认模型
    if (data.enabled === 0) {
        const defaultModel = await (
            await db.getDb()
        )
            .select()
            .from(models)
            .where(and(eq(models.provider_id, id), eq(models.is_default, 1)))
            .get();

        if (defaultModel && defaultModel.id !== undefined) {
            throw new Error('无法禁用包含默认模型的服务商，请先设置其他模型为默认');
        }
    }

    await (await db.getDb()).update(providers).set(data).where(eq(providers.id, id)).run();
};

/**
 * 删除服务商
 * 验证：不能删除内置服务商或包含默认模型的服务商
 */
export const deleteProvider = async (id: number): Promise<boolean> => {
    const provider = await findProviderById(id);

    if (!provider) {
        throw new Error(`Provider with id ${id} not found`);
    }

    if (provider.is_builtin) {
        throw new Error('无法删除内置服务商');
    }

    // 检查是否有默认模型
    const defaultModel = await (
        await db.getDb()
    )
        .select()
        .from(models)
        .where(and(eq(models.provider_id, id), eq(models.is_default, 1)))
        .get();

    if (defaultModel && defaultModel.id !== undefined) {
        throw new Error('无法删除包含默认模型的服务商，请先设置其他模型为默认');
    }

    await (await db.getDb()).delete(providers).where(eq(providers.id, id)).run();
    return true;
};
