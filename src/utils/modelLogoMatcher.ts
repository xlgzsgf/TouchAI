// Copyright (c) 2025. 千诚. Licensed under GPL v3.

/**
 * 模型 Logo 匹配配置
 * 每个模型厂商可以有多个关键词用于匹配模型名称
 */
interface ModelLogoMapping {
    logo: string; // logo 文件名
    keywords: string[]; // 匹配关键词（不区分大小写）
}

const MODEL_LOGO_MAPPINGS: ModelLogoMapping[] = [
    {
        logo: 'openai.png',
        keywords: ['openai', 'gpt', 'o1', 'o3', 'o4'],
    },
    {
        logo: 'claude.png',
        keywords: ['claude', 'anthropic'],
    },
    {
        logo: 'gemini.png',
        keywords: ['gemini', 'google'],
    },
    {
        logo: 'deepseek.png',
        keywords: ['deepseek'],
    },
    {
        logo: 'qwen.png',
        keywords: ['qwen', 'tongyi', '通义', 'qwq', 'qvq'],
    },
    {
        logo: 'zhipu.png',
        keywords: ['glm', 'zhipu', 'chatglm', '智谱', 'z-ai', 'zai'],
    },
    {
        logo: 'moonshot.png',
        keywords: ['moonshot', 'kimi'],
    },
    {
        logo: 'doubao.png',
        keywords: ['doubao', '豆包'],
    },
    {
        logo: 'hunyuan.png',
        keywords: ['hunyuan', '混元'],
    },
    {
        logo: 'minimax.png',
        keywords: ['minimax', 'abab'],
    },
    {
        logo: 'grok.png',
        keywords: ['grok'],
    },
    {
        logo: 'llama.png',
        keywords: ['llama', 'meta'],
    },
    {
        logo: 'longcat.png',
        keywords: ['longcat'],
    },
    {
        logo: 'mimo.png',
        keywords: ['mimo', 'xiaomi'],
    },
    {
        logo: 'cohere.png',
        keywords: ['cohere', 'command'],
    },
    {
        logo: 'gemma.png',
        keywords: ['gemma'],
    },
    {
        logo: 'mistral.png',
        keywords: ['mistral'],
    },
];

/**
 * 根据模型名称匹配对应的模型 logo
 * @param modelName 模型名称或 model_id
 * @returns logo 文件名，如果没有匹配则返回 null
 */
export function getModelLogoByModelName(modelName: string): string | null {
    if (!modelName) return null;

    const lowerModelName = modelName.toLowerCase();

    for (const mapping of MODEL_LOGO_MAPPINGS) {
        for (const keyword of mapping.keywords) {
            if (lowerModelName.includes(keyword.toLowerCase())) {
                return mapping.logo;
            }
        }
    }

    return null;
}
