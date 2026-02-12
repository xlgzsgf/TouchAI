// Copyright (c) 2026. 千诚. Licensed under GPL v3

import type { ProviderType } from '@database/schema';

import { AnthropicProvider } from './providers/anthropic';
import { OpenAiProvider } from './providers/openai';
import type { AiProvider, AiProviderConfig } from './types';

interface ProviderAdapter {
    type: ProviderType;
    normalizeEndpoint: (endpoint: string) => string;
    create: (config: AiProviderConfig) => AiProvider;
}

const trimTrailingSlash = (endpoint: string) => endpoint.replace(/\/+$/, '');

const ensureSuffix = (endpoint: string, suffix: string) =>
    endpoint.endsWith(suffix) ? endpoint : `${endpoint}${suffix}`;

const providerRegistry = new Map<ProviderType, ProviderAdapter>();

function registerProvider(adapter: ProviderAdapter): void {
    providerRegistry.set(adapter.type, adapter);
}

registerProvider({
    type: 'openai',
    normalizeEndpoint: (endpoint) => ensureSuffix(trimTrailingSlash(endpoint), '/v1'),
    create: (config) => new OpenAiProvider(config),
});

registerProvider({
    type: 'anthropic',
    normalizeEndpoint: (endpoint) => trimTrailingSlash(endpoint),
    create: (config) => new AnthropicProvider(config),
});

function getProviderAdapter(type: ProviderType): ProviderAdapter {
    const adapter = providerRegistry.get(type);
    if (!adapter) {
        throw new Error(`Unknown provider type: ${type}`);
    }
    return adapter;
}

/**
 * 规范化不同服务商的 endpoint 格式。
 */
export function normalizeProviderEndpoint(type: ProviderType, endpoint: string): string {
    return getProviderAdapter(type).normalizeEndpoint(endpoint);
}

/**
 * 通过 provider 注册表创建对应的 provider 实例。
 */
export function createProviderFromRegistry(
    type: ProviderType,
    config: AiProviderConfig
): AiProvider {
    return getProviderAdapter(type).create(config);
}
