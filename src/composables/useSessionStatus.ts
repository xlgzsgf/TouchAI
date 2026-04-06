// Copyright (c) 2026. 千诚. Licensed under GPL v3

import { onUnmounted, ref } from 'vue';

import { sessionTaskCenter } from '@/services/AgentService';
import type { SessionTaskStatus } from '@/services/AgentService/task/types';
import { eventService } from '@/services/EventService';
import { AppEvent } from '@/services/EventService/types';

/**
 * 会话状态订阅 composable
 *
 * 通过事件总线订阅会话任务状态变更，提供响应式的会话状态查询接口
 */
export function useSessionStatus() {
    const sessionStatuses = ref<Map<number, SessionTaskStatus>>(new Map());
    const clearTimers = new Map<number, ReturnType<typeof setTimeout>>();
    let unsubscribe: (() => void) | null = null;
    let disposed = false;

    function cancelPendingClear(sessionId: number) {
        const timer = clearTimers.get(sessionId);
        if (!timer) {
            return;
        }

        clearTimeout(timer);
        clearTimers.delete(sessionId);
    }

    function setSessionStatus(sessionId: number, status: SessionTaskStatus) {
        cancelPendingClear(sessionId);

        const nextStatuses = new Map(sessionStatuses.value);
        nextStatuses.set(sessionId, status);
        sessionStatuses.value = nextStatuses;
    }

    function clearSessionStatus(sessionId: number) {
        cancelPendingClear(sessionId);
        if (!sessionStatuses.value.has(sessionId)) {
            return;
        }

        const nextStatuses = new Map(sessionStatuses.value);
        nextStatuses.delete(sessionId);
        sessionStatuses.value = nextStatuses;
    }

    function scheduleTerminalStatusClear(sessionId: number) {
        cancelPendingClear(sessionId);

        const timer = setTimeout(() => {
            clearTimers.delete(sessionId);
            clearSessionStatus(sessionId);
        }, 1000);

        clearTimers.set(sessionId, timer);
    }

    /**
     * 初始化：加载指定会话的当前状态
     */
    const refreshAllStatuses = (sessionIds: number[]) => {
        for (const timer of clearTimers.values()) {
            clearTimeout(timer);
        }
        clearTimers.clear();

        const newStatuses = new Map<number, SessionTaskStatus>();

        for (const sessionId of sessionIds) {
            const status = sessionTaskCenter.getSessionStatus(sessionId);
            if (status) {
                newStatuses.set(sessionId, status.status);
            }
        }

        sessionStatuses.value = newStatuses;
    };

    /**
     * 监听状态变更事件
     */
    void eventService
        .on(AppEvent.SESSION_TASK_STATUS_CHANGED, (event) => {
            setSessionStatus(event.sessionId, event.status);

            // 如果任务已终止，延迟清除状态
            if (
                event.status === 'completed' ||
                event.status === 'failed' ||
                event.status === 'cancelled'
            ) {
                scheduleTerminalStatusClear(event.sessionId);
            }
        })
        .then((unlisten) => {
            if (disposed) {
                unlisten();
                return;
            }

            unsubscribe = unlisten;
        })
        .catch((error) => {
            console.error('[useSessionStatus] Failed to subscribe session status updates:', error);
        });

    onUnmounted(() => {
        disposed = true;
        for (const timer of clearTimers.values()) {
            clearTimeout(timer);
        }
        clearTimers.clear();
        unsubscribe?.();
        unsubscribe = null;
    });

    return {
        sessionStatuses,
        getSessionStatus: (sessionId: number) => sessionStatuses.value.get(sessionId),
        refreshAllStatuses,
    };
}
