// Copyright (c) 2025. 千诚. Licensed under GPL v3

/**
 * 应用命令定义
 * 用于在搜索框中输入特殊命令来触发不同功能
 */

export enum AppCommand {
    SETTINGS = 'settings',
}

/**
 * 命令关键词映射
 * 支持多个关键词映射到同一个命令
 */
export const COMMAND_KEYWORDS: Record<string, AppCommand> = {
    '/设置': AppCommand.SETTINGS,
    '/set': AppCommand.SETTINGS,
    '/settings': AppCommand.SETTINGS,
};

/**
 * 检测输入是否为命令
 */
export function detectCommand(input: string): AppCommand | null {
    const trimmed = input.trim().toLowerCase();
    return COMMAND_KEYWORDS[trimmed] || null;
}

/**
 * 获取命令对应的路由路径
 */
export function getCommandRoute(command: AppCommand): string {
    switch (command) {
        case AppCommand.SETTINGS:
            return '/settings';
        default:
            return '/';
    }
}
