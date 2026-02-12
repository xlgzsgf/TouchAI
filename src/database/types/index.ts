// Copyright (c) 2026. 千诚. Licensed under GPL v3

import type {
    MessageRole,
    MetaKey,
    ProviderType,
    RequestStatus,
    SettingKey,
    StatisticKey,
} from '../schema';

// ==================== 基础类型 ====================

export type SettingIdentifier = string | SettingKey;
export type StatisticIdentifier = string | StatisticKey;

export type DbMessageRole = MessageRole;
export type DbProviderType = ProviderType;
export type DbRequestStatus = RequestStatus;

// ==================== 通用请求对象 ====================

export interface IdPayload {
    id: number;
}

export interface SessionIdPayload {
    sessionId: number;
}

export interface SessionTokenPayload {
    sessionId: string;
}

export interface ProviderIdPayload {
    providerId: number;
}

export interface ModelIdPayload {
    modelId: string;
}

export interface ModelDbIdPayload {
    modelId: number;
}

export interface MessageIdPayload {
    messageId: number;
}

export interface SearchKeywordPayload {
    keyword: string;
}

export interface LimitPayload {
    limit?: number;
}

export interface PaginationPayload {
    page: number;
    pageSize: number;
}

export interface KeyPayload<K extends string = string> {
    key: K;
}

export interface KeyValuePayload<K extends string = string, V = string> {
    key: K;
    value: V;
}

// ==================== 会话 ====================

export interface SessionEntity {
    id: number;
    session_id: string;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
}

export interface SessionCreateData {
    session_id: string;
    title: string;
    model: string;
    created_at?: string;
    updated_at?: string;
}

export type SessionUpdateData = Partial<SessionCreateData>;

export interface SearchSessionsPayload {
    keyword?: string;
    model?: string;
}

// ==================== 消息 ====================

export interface MessageEntity {
    id: number;
    session_id: number;
    role: DbMessageRole;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface MessageCreateData {
    session_id: number;
    role: DbMessageRole;
    content: string;
    created_at?: string;
    updated_at?: string;
}

export type MessageUpdateData = Partial<MessageCreateData>;

export interface MessageRoleFilterPayload extends SessionIdPayload {
    role: DbMessageRole;
}

export interface LatestMessagesPayload extends SessionIdPayload {
    limit?: number;
}

export interface SearchMessagesPayload extends SearchKeywordPayload {
    sessionId?: number;
}

export interface MessageWithSessionEntity {
    id: number;
    session_id: number;
    role: DbMessageRole;
    content: string;
    created_at: string;
    updated_at: string;
    session_title: string;
    session_model: string;
}

// ==================== 设置 ====================

export interface SettingEntity {
    id: number;
    key: string;
    value: string | null;
    created_at: string;
    updated_at: string;
}

export interface SettingCreateData {
    key: SettingIdentifier;
    value?: string | null;
    created_at?: string;
    updated_at?: string;
}

export type SettingUpdateData = Partial<SettingCreateData>;

export interface SettingsKeysPayload {
    keys: SettingIdentifier[];
}

export interface SettingsValuesPayload {
    values: Record<string, string>;
}

export interface SettingsValuesResult {
    values: Record<string, string | null>;
}

// ==================== 统计 ====================

export interface StatisticEntity {
    id: number;
    key: string;
    value: string | null;
    created_at: string;
    updated_at: string;
}

export interface StatisticCreateData {
    key: StatisticIdentifier;
    value?: string | null;
    created_at?: string;
    updated_at?: string;
}

export type StatisticUpdateData = Partial<StatisticCreateData>;

// ==================== 元数据（touchai_meta） ====================

export interface TouchAiMetaEntity {
    id: number;
    key: MetaKey;
    value: string | null;
    created_at: string;
    updated_at: string;
}

export interface TouchAiMetaCreateData {
    key: MetaKey;
    value?: string | null;
    created_at?: string;
    updated_at?: string;
}

export type TouchAiMetaUpdateData = Partial<TouchAiMetaCreateData>;

// ==================== 服务商 ====================

export interface ProviderEntity {
    id: number;
    name: string;
    type: DbProviderType;
    api_endpoint: string;
    api_key: string | null;
    logo: string;
    enabled: number;
    is_builtin: number;
    created_at: string;
    updated_at: string;
}

export interface ProviderCreateData {
    name: string;
    type: DbProviderType;
    api_endpoint: string;
    api_key?: string | null;
    logo: string;
    enabled?: number;
    is_builtin?: number;
    created_at?: string;
    updated_at?: string;
}

export type ProviderUpdateData = Partial<ProviderCreateData>;

// ==================== 模型 ====================

export interface ModelEntity {
    id: number;
    provider_id: number;
    name: string;
    model_id: string;
    is_default: number;
    last_used_at: string | null;
    attachment: number;
    modalities: string | null;
    open_weights: number;
    reasoning: number;
    release_date: string | null;
    temperature: number;
    tool_call: number;
    knowledge: string | null;
    context_limit: number | null;
    output_limit: number | null;
    is_custom_metadata: number;
    created_at: string;
    updated_at: string;
}

export interface ModelCreateData {
    provider_id: number;
    name: string;
    model_id: string;
    is_default?: number;
    last_used_at?: string | null;
    attachment?: number;
    modalities?: string | null;
    open_weights?: number;
    reasoning?: number;
    release_date?: string | null;
    temperature?: number;
    tool_call?: number;
    knowledge?: string | null;
    context_limit?: number | null;
    output_limit?: number | null;
    is_custom_metadata?: number;
    created_at?: string;
    updated_at?: string;
}

export type ModelUpdateData = Partial<ModelCreateData>;

export interface ProviderModelLookupPayload extends ProviderIdPayload {
    modelId: string;
}

export interface FindModelsWithProviderPayload {
    providerId?: number;
}

export interface ModelWithProvider {
    id: number;
    created_at: string;
    updated_at: string;
    provider_id: number;
    model_id: string;
    name: string;
    is_default: number;
    last_used_at: string | null;
    attachment: number;
    modalities: string | null;
    open_weights: number;
    reasoning: number;
    release_date: string | null;
    temperature: number;
    tool_call: number;
    knowledge: string | null;
    context_limit: number | null;
    output_limit: number | null;
    is_custom_metadata: number;
    provider_name: string;
    provider_type: DbProviderType;
    api_endpoint: string;
    api_key: string | null;
    provider_enabled: number;
    provider_logo: string;
}

// 向后兼容的类型别名（已废弃）
/** @deprecated 使用 ModelWithProvider 代替 */
export type ModelWithProviderAndMetadata = ModelWithProvider;

// ==================== AI 请求 ====================

export interface AiRequestEntity {
    id: number;
    session_id: number | null;
    model_id: number;
    prompt_message_id: number | null;
    response_message_id: number | null;
    status: DbRequestStatus;
    error_message: string | null;
    tokens_used: number | null;
    duration_ms: number | null;
    created_at: string;
    updated_at: string;
}

export interface AiRequestCreateData {
    session_id?: number | null;
    model_id: number;
    prompt_message_id?: number | null;
    response_message_id?: number | null;
    status?: DbRequestStatus;
    error_message?: string | null;
    tokens_used?: number | null;
    duration_ms?: number | null;
    created_at?: string;
    updated_at?: string;
}

export type AiRequestUpdateData = Partial<AiRequestCreateData>;

export interface AiRequestStatusPayload {
    status: DbRequestStatus;
}

// ==================== LLM 元数据 ====================

export interface LlmMetadataEntity {
    id: number;
    model_id: string;
    name: string;
    attachment: number;
    modalities: string;
    open_weights: number;
    reasoning: number;
    release_date: string | null;
    temperature: number;
    tool_call: number;
    knowledge: string | null;
    limit: string | null;
    created_at: string;
    updated_at: string;
}

export interface LlmMetadataCreateData {
    model_id: string;
    name: string;
    attachment?: number;
    modalities: string;
    open_weights?: number;
    reasoning?: number;
    release_date?: string | null;
    temperature?: number;
    tool_call?: number;
    knowledge?: string | null;
    limit?: string | null;
    created_at?: string;
    updated_at?: string;
}

export type LlmMetadataUpdateData = Partial<Omit<LlmMetadataCreateData, 'model_id'>>;

export interface LlmMetadataModelIdPayload {
    modelId: string;
}

export interface UpsertLlmMetadataPayload {
    modelId: string;
    metadata: LlmMetadataUpdateData;
}
