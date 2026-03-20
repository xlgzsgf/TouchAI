// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { count, desc, eq } from 'drizzle-orm';

import { db } from '../index';
import { aiRequests, models, providers } from '../schema';
import type { AiRequestCreateData, AiRequestEntity, AiRequestUpdateData } from '../types';
import { type ModelWithProvider, modelWithProviderSelection } from './models';

/**
 * 创建 AI 请求
 */
export const createAiRequest = async (
    requestDraft: AiRequestCreateData
): Promise<AiRequestEntity> => {
    const createdRequest = await db
        .getDb()
        .insert(aiRequests)
        .values(requestDraft)
        .returning()
        .get();

    if (!createdRequest || createdRequest.id === undefined) {
        throw new Error('Failed to create AI request');
    }

    return createdRequest;
};

/**
 * 更新 AI 请求
 */
export const updateAiRequest = async ({
    id,
    requestPatch,
}: {
    id: number;
    requestPatch: AiRequestUpdateData;
}): Promise<void> => {
    await db.getDb().update(aiRequests).set(requestPatch).where(eq(aiRequests.id, id)).run();
};

/**
 * 查找会话最近一次请求所使用的模型与服务商。
 */
export const findLatestModelBySessionId = async ({
    sessionId,
}: {
    sessionId: number;
}): Promise<ModelWithProvider | null> => {
    const result = await db
        .getDb()
        .select(modelWithProviderSelection)
        .from(aiRequests)
        .innerJoin(models, eq(models.id, aiRequests.model_id))
        .innerJoin(providers, eq(providers.id, models.provider_id))
        .where(eq(aiRequests.session_id, sessionId))
        .orderBy(desc(aiRequests.created_at), desc(aiRequests.id))
        .limit(1)
        .get();

    if (!result || result.id === undefined) {
        return null;
    }

    return result as ModelWithProvider;
};

/**
 * 统计 AI 请求数量
 */
export const countAiRequests = async (): Promise<number> => {
    const result = await db.getDb().select({ count: count() }).from(aiRequests).get();
    return result?.count || 0;
};

/**
 * 删除所有 AI 请求
 */
export const deleteAllAiRequests = async (): Promise<void> => {
    await db.getDb().delete(aiRequests).run();
};
