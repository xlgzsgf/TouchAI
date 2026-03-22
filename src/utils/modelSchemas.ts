// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { safeParseJsonWithSchema, z } from './zod';

const DEFAULT_MODEL_MODALITIES = {
    input: ['text'],
    output: ['text'],
} as const;

export const modelModalitiesSchema = z
    .object({
        input: z.array(z.string()).optional(),
        output: z.array(z.string()).optional(),
    })
    .transform((value) => ({
        input: value.input ?? [...DEFAULT_MODEL_MODALITIES.input],
        output: value.output ?? [...DEFAULT_MODEL_MODALITIES.output],
    }));

export type ModelModalities = z.infer<typeof modelModalitiesSchema>;

export const modelLimitSchema = z.object({
    context: z.coerce.number().int().positive().optional(),
    output: z.coerce.number().int().positive().optional(),
});

export type ModelLimit = z.infer<typeof modelLimitSchema>;

/**
 * 解析模型模态 JSON；脏数据时回退到纯文本输入输出。
 *
 * @param modalitiesJson 数据库存储的模态 JSON。
 * @returns 标准化后的模型模态。
 */
export function parseModelModalities(modalitiesJson?: string | null): ModelModalities {
    return safeParseJsonWithSchema(modelModalitiesSchema, modalitiesJson, {
        input: [...DEFAULT_MODEL_MODALITIES.input],
        output: [...DEFAULT_MODEL_MODALITIES.output],
    });
}

/**
 * 解析模型上下文/输出上限 JSON；脏数据时回退为空对象。
 *
 * @param limitJson 数据库存储的 limit JSON。
 * @returns 标准化后的 limit 结构。
 */
export function parseModelLimit(limitJson?: string | null): ModelLimit {
    return safeParseJsonWithSchema(modelLimitSchema, limitJson, {});
}

/**
 * 判断模型模态是否包含图像能力。
 *
 * @param modalities 已解析的模型模态。
 * @returns 是否支持图像输入或输出。
 */
export function supportsImageModality(modalities: ModelModalities): boolean {
    return modalities.input.includes('image') || modalities.output.includes('image');
}
