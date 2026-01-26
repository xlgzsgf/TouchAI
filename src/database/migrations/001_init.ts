// Copyright (c) 2025. 千诚. Licensed under GPL v3

import { Kysely } from 'kysely';

import { createTauriSqlDialect } from '../dialect';
import type { Database, Migration, TauriDatabase } from '../schema';
import { SettingKey } from '../schema';
import { createIndex, createUpdateTrigger, dropUpdateTrigger, withTimestamps } from './helpers';

/**
 * 初始化数据库结构
 */
export const init001: Migration = {
    version: 1,
    name: 'init',

    async up(db: TauriDatabase): Promise<void> {
        const kysely = new Kysely<Database>({
            dialect: createTauriSqlDialect(db),
        });

        // 创建设置表
        await withTimestamps(
            kysely.schema
                .createTable('settings')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('key', 'text', (col) => col.notNull().unique())
                .addColumn('value', 'text')
                .addColumn('description', 'text')
        ).execute();
        await createUpdateTrigger(kysely, 'settings');

        // 创建会话表
        await withTimestamps(
            kysely.schema
                .createTable('sessions')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('session_id', 'text', (col) => col.notNull().unique())
                .addColumn('title', 'text', (col) => col.notNull())
                .addColumn('model', 'text', (col) => col.notNull())
        ).execute();
        await createUpdateTrigger(kysely, 'sessions');
        await createIndex(kysely, 'idx_sessions_session_id', 'sessions', ['session_id']);
        await createIndex(kysely, 'idx_sessions_model', 'sessions', ['model']);

        // 创建消息表
        await withTimestamps(
            kysely.schema
                .createTable('messages')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('session_id', 'integer', (col) =>
                    col.notNull().references('sessions.id').onDelete('cascade')
                )
                .addColumn('role', 'text', (col) => col.notNull())
                .addColumn('content', 'text', (col) => col.notNull())
        ).execute();
        await createUpdateTrigger(kysely, 'messages');
        await createIndex(kysely, 'idx_messages_session_id', 'messages', ['session_id']);
        await createIndex(kysely, 'idx_messages_role', 'messages', ['role']);

        // 创建 models 表
        await withTimestamps(
            kysely.schema
                .createTable('models')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('model_id', 'text', (col) => col.notNull())
                .addColumn('type', 'text', (col) => col.notNull())
                .addColumn('priority', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('api_endpoint', 'text')
                .addColumn('api_key', 'text')
                .addColumn('max_tokens', 'integer')
                .addColumn('temperature', 'real')
                .addColumn('enabled', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('last_used_at', 'text')
                .addColumn('description', 'text')
        ).execute();
        await createUpdateTrigger(kysely, 'models');
        await createIndex(kysely, 'idx_models_type', 'models', ['type']);
        await createIndex(kysely, 'idx_models_priority', 'models', ['priority']);
        await createIndex(kysely, 'idx_models_enabled', 'models', ['enabled']);

        // 创建 ai_requests 表
        await withTimestamps(
            kysely.schema
                .createTable('ai_requests')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('session_id', 'integer', (col) =>
                    col.references('sessions.id').onDelete('set null')
                )
                .addColumn('model_id', 'integer', (col) =>
                    col.notNull().references('models.id').onDelete('cascade')
                )
                .addColumn('prompt', 'text', (col) => col.notNull())
                .addColumn('response', 'text')
                .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
                .addColumn('error_message', 'text')
                .addColumn('tokens_used', 'integer')
                .addColumn('duration_ms', 'integer')
        ).execute();
        await createUpdateTrigger(kysely, 'ai_requests');
        await createIndex(kysely, 'idx_ai_requests_session_id', 'ai_requests', ['session_id']);
        await createIndex(kysely, 'idx_ai_requests_status', 'ai_requests', ['status']);

        // 插入默认设置（如果不存在）
        const existingSettings = await kysely.selectFrom('settings').select('key').execute();

        const existingKeys = new Set(existingSettings.map((s) => s.key));
        const defaultSettings = [
            { key: SettingKey.THEME, value: 'light', description: '应用主题' },
            { key: SettingKey.LANGUAGE, value: 'zh-CN', description: '界面语言' },
            { key: SettingKey.AUTO_START, value: 'false', description: '开机自启动' },
        ];

        const settingsToInsert = defaultSettings.filter((s) => !existingKeys.has(s.key));

        if (settingsToInsert.length > 0) {
            await kysely.insertInto('settings').values(settingsToInsert).execute();
        }

        // 插入默认模型（如果不存在）
        const existingModels = await kysely.selectFrom('models').select('model_id').execute();

        const existingModelIds = new Set(existingModels.map((m) => m.model_id));
        const defaultModels: Array<{
            name: string;
            model_id: string;
            type: 'openai' | 'claude' | 'ollama';
            priority: number;
            api_endpoint: string;
            enabled: number;
            description: string;
        }> = [
            {
                name: 'GPT-4',
                model_id: 'gpt-4',
                type: 'openai',
                priority: 100,
                api_endpoint: 'https://api.openai.com/v1',
                enabled: 1, // 默认启用
                description: 'OpenAI GPT-4 model',
            },
            {
                name: 'Claude Sonnet 4',
                model_id: 'claude-sonnet-4-20250514',
                type: 'claude',
                priority: 90,
                api_endpoint: 'https://api.anthropic.com/v1',
                enabled: 0,
                description: 'Anthropic Claude Sonnet 4',
            },
            {
                name: 'Ollama Llama 3',
                model_id: 'llama3',
                type: 'ollama',
                priority: 80,
                api_endpoint: 'http://localhost:11434',
                enabled: 0,
                description: 'Local Ollama Llama 3 model',
            },
        ];

        const modelsToInsert = defaultModels.filter((m) => !existingModelIds.has(m.model_id));

        if (modelsToInsert.length > 0) {
            await kysely.insertInto('models').values(modelsToInsert).execute();
        }

        console.log('Migration 001: Database initialized');
    },

    async down(db: TauriDatabase): Promise<void> {
        const kysely = new Kysely<Database>({
            dialect: createTauriSqlDialect(db),
        });

        // 删除 ai_requests 表
        await kysely.schema.dropIndex('idx_ai_requests_status').ifExists().execute();
        await kysely.schema.dropIndex('idx_ai_requests_session_id').ifExists().execute();
        await dropUpdateTrigger(kysely, 'ai_requests');
        await kysely.schema.dropTable('ai_requests').ifExists().execute();

        // 删除 models 表
        await kysely.schema.dropIndex('idx_models_enabled').ifExists().execute();
        await kysely.schema.dropIndex('idx_models_priority').ifExists().execute();
        await kysely.schema.dropIndex('idx_models_type').ifExists().execute();
        await dropUpdateTrigger(kysely, 'models');
        await kysely.schema.dropTable('models').ifExists().execute();

        // 删除消息表
        await kysely.schema.dropIndex('idx_messages_role').ifExists().execute();
        await kysely.schema.dropIndex('idx_messages_session_id').ifExists().execute();
        await dropUpdateTrigger(kysely, 'messages');
        await kysely.schema.dropTable('messages').ifExists().execute();

        // 删除会话表
        await kysely.schema.dropIndex('idx_sessions_model').ifExists().execute();
        await kysely.schema.dropIndex('idx_sessions_session_id').ifExists().execute();
        await dropUpdateTrigger(kysely, 'sessions');
        await kysely.schema.dropTable('sessions').ifExists().execute();

        // 删除设置表
        await dropUpdateTrigger(kysely, 'settings');
        await kysely.schema.dropTable('settings').ifExists().execute();
    },
};
