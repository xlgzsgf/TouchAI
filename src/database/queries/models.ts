// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { UpdateResult } from 'kysely';

import { db } from '../index';
import type { Model, ModelUpdate, NewModel } from '../schema';

/**
 * 根据 ID 查找模型
 */
export const findModelById = (id: number) =>
    db.getKysely().selectFrom('models').selectAll().where('id', '=', id).executeTakeFirst();

/**
 * 查找所有启用的模型（按优先级降序）
 */
export const findEnabledModelsByPriority = () =>
    db
        .getKysely()
        .selectFrom('models')
        .selectAll()
        .where('enabled', '=', 1)
        .orderBy('priority', 'desc')
        .execute();

/**
 * 根据类型查找模型
 */
export const findModelsByType = (type: 'openai' | 'claude' | 'ollama') =>
    db.getKysely().selectFrom('models').selectAll().where('type', '=', type).execute();

/**
 * 查找所有模型
 */
export const findAllModels = () => db.getKysely().selectFrom('models').selectAll().execute();

/**
 * 创建模型
 */
export const createModel = async (data: NewModel): Promise<Model> => {
    const result = await db
        .getKysely()
        .insertInto('models')
        .values(data)
        .returningAll()
        .executeTakeFirst();

    if (!result) {
        // 如果 returning 不工作，尝试获取最后插入的记录
        const lastInsert = await db
            .getKysely()
            .selectFrom('models')
            .selectAll()
            .orderBy('id', 'desc')
            .limit(1)
            .executeTakeFirst();

        if (!lastInsert) {
            throw new Error('Failed to create model');
        }
        return lastInsert;
    }

    return result;
};

/**
 * 更新模型
 */
export const updateModel = async (id: number, data: ModelUpdate): Promise<UpdateResult> => {
    const result = await db
        .getKysely()
        .updateTable('models')
        .set(data)
        .where('id', '=', id)
        .executeTakeFirst();

    if (!result || result.numUpdatedRows === 0n) {
        throw new Error(`Model with id ${id} not found`);
    }
    return result;
};

/**
 * 更新模型最后使用时间
 */
export const updateModelLastUsed = (id: number) =>
    updateModel(id, { last_used_at: new Date().toISOString() });

/**
 * 删除模型
 */
export const deleteModel = async (id: number): Promise<boolean> => {
    const result = await db
        .getKysely()
        .deleteFrom('models')
        .where('id', '=', id)
        .executeTakeFirst();
    return Number(result.numDeletedRows) > 0;
};

/**
 * 统计模型数量
 */
export const countModels = async (): Promise<number> => {
    const result = await db
        .getKysely()
        .selectFrom('models')
        .select((eb) => eb.fn.countAll().as('count'))
        .executeTakeFirst();
    return Number(result?.count || 0);
};
