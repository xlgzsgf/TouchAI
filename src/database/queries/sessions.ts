// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { UpdateResult } from 'kysely';

import { db } from '../index';
import type { NewSession, Session, SessionUpdate } from '../schema';

/**
 * 根据 ID 查找会话
 */
export const findSessionById = (id: number) =>
    db.getKysely().selectFrom('sessions').selectAll().where('id', '=', id).executeTakeFirst();

/**
 * 根据 session_id 查找会话
 */
export const findSessionBySessionId = (sessionId: string) =>
    db
        .getKysely()
        .selectFrom('sessions')
        .selectAll()
        .where('session_id', '=', sessionId)
        .executeTakeFirst();

/**
 * 查找所有会话
 */
export const findAllSessions = () =>
    db.getKysely().selectFrom('sessions').selectAll().orderBy('created_at', 'desc').execute();

/**
 * 搜索会话
 */
export const searchSessions = (keyword?: string, model?: string) => {
    let query = db.getKysely().selectFrom('sessions').selectAll();

    if (keyword) {
        query = query.where('title', 'like', `%${keyword}%`);
    }

    if (model) {
        query = query.where('model', '=', model);
    }

    return query.orderBy('created_at', 'desc').execute();
};

/**
 * 分页查询会话
 */
export const paginateSessions = (page: number, pageSize: number) =>
    db
        .getKysely()
        .selectFrom('sessions')
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .execute();

/**
 * 创建会话
 */
export const createSession = async (data: NewSession): Promise<Session> => {
    await db.getKysely().insertInto('sessions').values(data).execute();

    // 获取最后插入的记录
    const lastInsert = await db
        .getKysely()
        .selectFrom('sessions')
        .selectAll()
        .orderBy('id', 'desc')
        .limit(1)
        .executeTakeFirst();

    if (!lastInsert) {
        throw new Error('Failed to create session');
    }
    return lastInsert;
};

/**
 * 更新会话
 */
export const updateSession = async (id: number, data: SessionUpdate): Promise<UpdateResult> => {
    const result = await db
        .getKysely()
        .updateTable('sessions')
        .set(data)
        .where('id', '=', id)
        .executeTakeFirst();

    if (!result || result.numUpdatedRows === 0n) {
        throw new Error(`Session with id ${id} not found`);
    }

    return result;
};

/**
 * 删除会话
 */
export const deleteSession = async (id: number): Promise<boolean> => {
    const result = await db
        .getKysely()
        .deleteFrom('sessions')
        .where('id', '=', id)
        .executeTakeFirst();

    return Number(result.numDeletedRows) > 0;
};

/**
 * 统计会话数
 */
export const countSessions = async (): Promise<number> => {
    const result = await db
        .getKysely()
        .selectFrom('sessions')
        .select((eb) => eb.fn.countAll<number>().as('count'))
        .executeTakeFirst();

    return result?.count || 0;
};

/**
 * 检查会话是否存在
 */
export const sessionExists = async (id: number): Promise<boolean> => {
    const result = await db
        .getKysely()
        .selectFrom('sessions')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst();

    return result !== undefined;
};
