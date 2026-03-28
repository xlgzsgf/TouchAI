// Copyright (c) 2026. 千诚. Licensed under GPL v3

import type { ProviderDriver } from '@database/schema';

import { AnthropicProviderAdapter } from './providers/anthropic';
import { AnthropicCompatibleProviderAdapter } from './providers/anthropic-compatible';
import { DeepSeekProviderAdapter } from './providers/deepseek';
import { GoogleProviderAdapter } from './providers/google';
import { MoonshotProviderAdapter } from './providers/moonshot';
import { OpenAIProviderAdapter } from './providers/openai';
import { OpenAICompatibleProviderAdapter } from './providers/openai-compatible';
import { normalizeProviderBaseUrl } from './providers/shared/ai-sdk-base';
import { XaiProviderAdapter } from './providers/xai';
import type { AiProvider, AiProviderConfig } from './types';

export interface ProviderDriverDefinition {
    driver: ProviderDriver;
    label: string;
    logo: string;
    placeholder: string;
}

interface ProviderAdapter {
    driver: ProviderDriver;
    create: (config: AiProviderConfig) => AiProvider;
}

export const providerDriverDefinitions: ProviderDriverDefinition[] = [
    {
        driver: 'openai',
        label: 'OpenAI',
        logo: 'openai.png',
        placeholder: 'https://api.openai.com',
    },
    {
        driver: 'anthropic',
        label: 'Anthropic',
        logo: 'anthropic.png',
        placeholder: 'https://api.anthropic.com',
    },
    {
        driver: 'google',
        label: 'Google',
        logo: 'gemini.png',
        placeholder: 'https://generativelanguage.googleapis.com',
    },
    {
        driver: 'deepseek',
        label: 'DeepSeek',
        logo: 'deepseek.png',
        placeholder: 'https://api.deepseek.com',
    },
    {
        driver: 'xai',
        label: 'xAI',
        logo: 'grok.png',
        placeholder: 'https://api.x.ai',
    },
    {
        driver: 'moonshot',
        label: 'Moonshot',
        logo: 'moonshot.png',
        placeholder: 'https://api.moonshot.cn',
    },
    {
        driver: 'openai-compatible',
        label: 'OpenAI 兼容',
        logo: 'openai.png',
        placeholder: 'https://your-host/v1',
    },
    {
        driver: 'anthropic-compatible',
        label: 'Anthropic 兼容',
        logo: 'anthropic.png',
        placeholder: 'https://your-host/v1',
    },
];

const providerRegistry = new Map<ProviderDriver, ProviderAdapter>();

function registerProvider(adapter: ProviderAdapter): void {
    providerRegistry.set(adapter.driver, adapter);
}

registerProvider({
    driver: 'openai',
    create: (config) => new OpenAIProviderAdapter(config),
});

registerProvider({
    driver: 'anthropic',
    create: (config) => new AnthropicProviderAdapter(config),
});

registerProvider({
    driver: 'google',
    create: (config) => new GoogleProviderAdapter(config),
});

registerProvider({
    driver: 'deepseek',
    create: (config) => new DeepSeekProviderAdapter(config),
});

registerProvider({
    driver: 'xai',
    create: (config) => new XaiProviderAdapter(config),
});

registerProvider({
    driver: 'moonshot',
    create: (config) => new MoonshotProviderAdapter(config),
});

registerProvider({
    driver: 'openai-compatible',
    create: (config) => new OpenAICompatibleProviderAdapter(config),
});

registerProvider({
    driver: 'anthropic-compatible',
    create: (config) => new AnthropicCompatibleProviderAdapter(config),
});

function getProviderAdapter(driver: ProviderDriver): ProviderAdapter {
    const adapter = providerRegistry.get(driver);
    if (!adapter) {
        throw new Error(`Unknown provider driver: ${driver}`);
    }
    return adapter;
}

/**
 * 获取服务商驱动的展示元信息。
 */
export function getProviderDriverDefinition(driver: ProviderDriver): ProviderDriverDefinition {
    const definition = providerDriverDefinitions.find((item) => item.driver === driver);
    if (!definition) {
        throw new Error(`Unknown provider driver: ${driver}`);
    }
    return definition;
}

/**
 * 通过 provider 注册表创建对应的 provider 实例。
 */
export function createProviderFromRegistry(
    driver: ProviderDriver,
    config: AiProviderConfig
): AiProvider {
    return getProviderAdapter(driver).create(config);
}

export { normalizeProviderBaseUrl };
