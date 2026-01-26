// Copyright (c) 2025. 千诚. Licensed under GPL v3

import type { Migration } from '../schema';
import { init001 } from './001_init';

/**
 * 所有数据库迁移
 * 按版本号升序排列
 */
export const migrations: Migration[] = [init001];

export { MigrationManager } from './manager';
