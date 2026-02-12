import { invoke } from '@tauri-apps/api/core';

export const database = {
    /**
     * 获取数据库文件路径
     * @returns 数据库文件的完整路径
     */
    getDatabasePath(): Promise<string> {
        return invoke<string>('get_database_path');
    },
} as const;
