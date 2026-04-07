import { getCurrentWindow } from '@tauri-apps/api/window';
import { ref } from 'vue';

export function useSearchWindowPin() {
    const currentWindow = getCurrentWindow();
    const isPinned = ref(false);
    let lastOperation: Promise<void> = Promise.resolve();

    function queuePinOperation<T>(operation: () => Promise<T>): Promise<T> {
        const run = lastOperation.catch(() => undefined).then(operation);
        lastOperation = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    function syncWindowPinState(): Promise<boolean> {
        return queuePinOperation(async () => {
            const nextState = await currentWindow.isAlwaysOnTop();
            isPinned.value = nextState;
            return nextState;
        });
    }

    function setWindowPinned(value: boolean): Promise<boolean> {
        return queuePinOperation(async () => {
            await currentWindow.setAlwaysOnTop(value);
            const nextState = await currentWindow.isAlwaysOnTop();
            isPinned.value = nextState;
            return nextState;
        });
    }

    function toggleWindowPin(): Promise<boolean> {
        return queuePinOperation(async () => {
            const currentState = await currentWindow.isAlwaysOnTop();
            await currentWindow.setAlwaysOnTop(!currentState);
            const nextState = await currentWindow.isAlwaysOnTop();
            isPinned.value = nextState;
            return nextState;
        });
    }

    return {
        isPinned,
        syncWindowPinState,
        setWindowPinned,
        toggleWindowPin,
    };
}
