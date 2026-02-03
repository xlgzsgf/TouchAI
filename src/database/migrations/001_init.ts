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

        // 创建 providers 表
        await withTimestamps(
            kysely.schema
                .createTable('providers')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('type', 'text', (col) => col.notNull())
                .addColumn('api_endpoint', 'text', (col) => col.notNull())
                .addColumn('api_key', 'text')
                .addColumn('logo', 'text', (col) => col.notNull())
                .addColumn('enabled', 'integer', (col) => col.notNull().defaultTo(1))
                .addColumn('is_builtin', 'integer', (col) => col.notNull().defaultTo(0))
        ).execute();
        await createUpdateTrigger(kysely, 'providers');
        await createIndex(kysely, 'idx_providers_type', 'providers', ['type']);
        await createIndex(kysely, 'idx_providers_enabled', 'providers', ['enabled']);
        await createIndex(kysely, 'idx_providers_is_builtin', 'providers', ['is_builtin']);

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
                .addColumn('provider_id', 'integer', (col) =>
                    col.notNull().references('providers.id').onDelete('cascade')
                )
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('model_id', 'text', (col) => col.notNull())
                .addColumn('is_default', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('last_used_at', 'text')
        ).execute();
        await createUpdateTrigger(kysely, 'models');
        await createIndex(kysely, 'idx_models_provider_id', 'models', ['provider_id']);
        await createIndex(kysely, 'idx_models_is_default', 'models', ['is_default']);

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

        // 创建 llm_metadata 表
        await withTimestamps(
            kysely.schema
                .createTable('llm_metadata')
                .ifNotExists()
                .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
                .addColumn('model_id', 'text', (col) => col.notNull().unique())
                .addColumn('name', 'text', (col) => col.notNull())
                .addColumn('attachment', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('modalities', 'text', (col) => col.notNull()) // JSON string
                .addColumn('open_weights', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('reasoning', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('release_date', 'text')
                .addColumn('temperature', 'integer', (col) => col.notNull().defaultTo(1))
                .addColumn('tool_call', 'integer', (col) => col.notNull().defaultTo(0))
                .addColumn('knowledge', 'text') // JSON string
                .addColumn('limit', 'text') // JSON string
        ).execute();
        await createUpdateTrigger(kysely, 'llm_metadata');
        await createIndex(kysely, 'idx_llm_metadata_model_id', 'llm_metadata', ['model_id']);

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

        // 插入内置服务商和模型
        const BUILTIN_PROVIDERS = [
            {
                name: 'OpenAI',
                type: 'openai',
                api_endpoint: 'https://api.openai.com',
                logo: 'openai.png',
                enabled: 1,
                is_builtin: 1,
            },
            {
                name: 'Anthropic',
                type: 'anthropic',
                api_endpoint: 'https://api.anthropic.com',
                logo: 'anthropic.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: 'DeepSeek',
                type: 'openai',
                api_endpoint: 'https://api.deepseek.com',
                logo: 'deepseek.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: '火山引擎',
                type: 'openai',
                api_endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
                logo: 'volcengine.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: 'Gemini',
                type: 'openai',
                api_endpoint: 'https://generativelanguage.googleapis.com',
                logo: 'gemini.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: 'Grok',
                type: 'openai',
                api_endpoint: 'https://api.x.ai',
                logo: 'grok.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: '腾讯混元',
                type: 'openai',
                api_endpoint: 'https://api.hunyuan.cloud.tencent.com',
                logo: 'hunyuan.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: 'MiniMax',
                type: 'openai',
                api_endpoint: 'https://api.minimax.chat',
                logo: 'minimax.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: '月之暗面',
                type: 'openai',
                api_endpoint: 'https://api.moonshot.cn',
                logo: 'moonshot.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: '阿里云百炼',
                type: 'openai',
                api_endpoint: 'https://dashscope.aliyuncs.com/compatible-mode',
                logo: 'bailian.png',
                enabled: 0,
                is_builtin: 1,
            },
            {
                name: '智谱',
                type: 'openai',
                api_endpoint: 'https://open.bigmodel.cn/api/paas',
                logo: 'zhipu.png',
                enabled: 0,
                is_builtin: 1,
            },
        ];

        const existingProviders = await kysely.selectFrom('providers').select('name').execute();

        if (existingProviders.length === 0) {
            for (const provider of BUILTIN_PROVIDERS) {
                await db.execute(
                    `INSERT INTO providers (name, type, api_endpoint, logo, enabled, is_builtin)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        provider.name,
                        provider.type,
                        provider.api_endpoint,
                        provider.logo,
                        provider.enabled,
                        provider.is_builtin,
                    ]
                );
            }
        }

        console.log('Migration 001: Database initialized');
    },

    async down(db: TauriDatabase): Promise<void> {
        const kysely = new Kysely<Database>({
            dialect: createTauriSqlDialect(db),
        });

        // 删除 llm_metadata 表
        await kysely.schema.dropIndex('idx_llm_metadata_model_id').ifExists().execute();
        await dropUpdateTrigger(kysely, 'llm_metadata');
        await kysely.schema.dropTable('llm_metadata').ifExists().execute();

        // 删除 ai_requests 表
        await kysely.schema.dropIndex('idx_ai_requests_status').ifExists().execute();
        await kysely.schema.dropIndex('idx_ai_requests_session_id').ifExists().execute();
        await dropUpdateTrigger(kysely, 'ai_requests');
        await kysely.schema.dropTable('ai_requests').ifExists().execute();

        // 删除 models 表
        await kysely.schema.dropIndex('idx_models_is_default').ifExists().execute();
        await kysely.schema.dropIndex('idx_models_provider_id').ifExists().execute();
        await dropUpdateTrigger(kysely, 'models');
        await kysely.schema.dropTable('models').ifExists().execute();

        // 删除 providers 表
        await kysely.schema.dropIndex('idx_providers_is_builtin').ifExists().execute();
        await kysely.schema.dropIndex('idx_providers_enabled').ifExists().execute();
        await kysely.schema.dropIndex('idx_providers_type').ifExists().execute();
        await dropUpdateTrigger(kysely, 'providers');
        await kysely.schema.dropTable('providers').ifExists().execute();

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
