// Copyright (c) 2025. 千诚. Licensed under GPL v3

import type { QueryResult } from '@tauri-apps/plugin-sql';
import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

// ==================== Tauri 相关类型 ====================

/**
 * SQL 参数类型
 */
export type SqlValue = string | number | boolean | null | Uint8Array;

/**
 * 数据库配置选项
 */
export interface DatabaseOptions {
    /**
     * 数据库路径，支持以下格式：
     * - sqlite:database.db (相对于 APPDATA 目录)
     * - sqlite://path/to/database.db (绝对路径)
     */
    path: string;
}

/**
 * Tauri SQL 数据库接口
 */
export interface TauriDatabase {
    execute(sql: string, bindValues?: SqlValue[]): Promise<QueryResult>;
    select<T = unknown>(sql: string, bindValues?: SqlValue[]): Promise<T[]>;
    close(): Promise<void>;
}

// ==================== 迁移相关类型 ====================

/**
 * 迁移接口
 */
export interface Migration {
    version: number;
    name: string;
    up: (db: TauriDatabase) => Promise<void>;
    down?: (db: TauriDatabase) => Promise<void>;
}

/**
 * 迁移记录
 */
export interface MigrationRecord {
    id: number;
    version: number;
    name: string;
    applied_at: string;
    created_at: string;
    updated_at: string;
}

// ==================== 表结构定义 ====================

/**
 * 会话表
 */
export interface SessionsTable {
    id: Generated<number>;
    session_id: string;
    title: string;
    model: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

/**
 * 消息表
 */
export interface MessagesTable {
    id: Generated<number>;
    session_id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

/**
 * 设置键枚举
 */
export enum SettingKey {
    THEME = 'theme',
    LANGUAGE = 'language',
    AUTO_START = 'auto_start',
}

/**
 * 设置表
 */
export interface SettingsTable {
    id: Generated<number>;
    key: string;
    value: string | null;
    description: string | null;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

/**
 * AI 服务商表
 */
export interface ProvidersTable {
    id: Generated<number>;
    name: string;
    type: 'openai' | 'anthropic';
    api_endpoint: string;
    api_key: string | null;
    logo: string;
    enabled: number;
    is_builtin: number;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

/**
 * AI 模型表
 */
export interface ModelsTable {
    id: Generated<number>;
    provider_id: number;
    name: string;
    model_id: string;
    is_default: number;
    last_used_at: string | null;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

/**
 * AI 请求表
 */
export interface AiRequestsTable {
    id: Generated<number>;
    session_id: number | null;
    model_id: number;
    prompt: string;
    response: string | null;
    status: 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';
    error_message: string | null;
    tokens_used: number | null;
    duration_ms: number | null;
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

/**
 * LLM 元数据表
 */
export interface LlmMetadataTable {
    id: Generated<number>;
    model_id: string;
    name: string;
    attachment: number;
    modalities: string; // JSON string
    open_weights: number;
    reasoning: number;
    release_date: string | null;
    temperature: number;
    tool_call: number;
    knowledge: string | null; // JSON string
    limit: string | null; // JSON string
    created_at: Generated<string>;
    updated_at: Generated<string>;
}

/**
 * 数据库 Schema（Kysely）
 */
export interface Database {
    sessions: SessionsTable;
    messages: MessagesTable;
    settings: SettingsTable;
    providers: ProvidersTable;
    models: ModelsTable;
    ai_requests: AiRequestsTable;
    llm_metadata: LlmMetadataTable;
}

// ==================== 类型别名 ====================

export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;
export type SessionUpdate = Updateable<SessionsTable>;

export type Message = Selectable<MessagesTable>;
export type NewMessage = Insertable<MessagesTable>;
export type MessageUpdate = Updateable<MessagesTable>;

export type Setting = Selectable<SettingsTable>;
export type NewSetting = Insertable<SettingsTable>;
export type SettingUpdate = Updateable<SettingsTable>;

export type Provider = Selectable<ProvidersTable>;
export type NewProvider = Insertable<ProvidersTable>;
export type ProviderUpdate = Updateable<ProvidersTable>;

export type Model = Selectable<ModelsTable>;
export type NewModel = Insertable<ModelsTable>;
export type ModelUpdate = Updateable<ModelsTable>;

export type AiRequest = Selectable<AiRequestsTable>;
export type NewAiRequest = Insertable<AiRequestsTable>;
export type AiRequestUpdate = Updateable<AiRequestsTable>;

export type LlmMetadata = Selectable<LlmMetadataTable>;
export type NewLlmMetadata = Insertable<LlmMetadataTable>;
export type LlmMetadataUpdate = Updateable<LlmMetadataTable>;

export type MessageRole = MessagesTable['role'];
export type ProviderType = ProvidersTable['type'];
export type RequestStatus = AiRequestsTable['status'];
