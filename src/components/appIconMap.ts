import type { Component } from 'vue';

import IconAiBrain from '~icons/hugeicons/ai-brain-02';
import IconWrench from '~icons/hugeicons/wrench-01';
import IconAddCircle from '~icons/solar/add-circle-linear';
import IconAltArrowDown from '~icons/solar/alt-arrow-down-linear';
import IconAltArrowRight from '~icons/solar/alt-arrow-right-linear';
import IconCaseMinimalistic from '~icons/solar/case-minimalistic-linear';
import IconCheckCircle from '~icons/solar/check-circle-linear';
import IconCloseCircle from '~icons/solar/close-circle-linear';
import IconCloseSquare from '~icons/solar/close-square-linear';
import IconCopy from '~icons/solar/copy-linear';
import IconDangerTriangle from '~icons/solar/danger-triangle-linear';
import IconDatabase from '~icons/solar/database-linear';
import IconDocumentText from '~icons/solar/document-text-linear';
import IconEyeClosed from '~icons/solar/eye-closed-linear';
import IconEye from '~icons/solar/eye-linear';
import IconFile from '~icons/solar/file-linear';
import IconHistory from '~icons/solar/history-linear';
import IconInfoCircle from '~icons/solar/info-circle-linear';
import IconLinkCircle from '~icons/solar/link-circle-linear';
import IconMagnifer from '~icons/solar/magnifer-linear';
import IconMinimizeSquare from '~icons/solar/minimize-square-linear';
import IconPen2 from '~icons/solar/pen-2-linear';
import IconPin from '~icons/solar/pin-linear';
import IconPlay from '~icons/solar/play-linear';
import IconRefresh from '~icons/solar/refresh-linear';
import IconSettings from '~icons/solar/settings-linear';
import IconStop from '~icons/solar/stop-linear';
import IconTrashBinMinimalistic from '~icons/solar/trash-bin-minimalistic-linear';
import IconTrashBinTrash from '~icons/solar/trash-bin-trash-linear';

export const appIconMap = {
    'arrow-down': IconAltArrowDown,
    'check-circle': IconCheckCircle,
    'chevron-down': IconAltArrowDown,
    'chevron-right': IconAltArrowRight,
    close: IconCloseSquare,
    copy: IconCopy,
    database: IconDatabase,
    delete: IconTrashBinTrash,
    'document-text': IconDocumentText,
    edit: IconPen2,
    'exclamation-triangle': IconDangerTriangle,
    eye: IconEye,
    'eye-off': IconEyeClosed,
    file: IconFile,
    history: IconHistory,
    'information-circle': IconInfoCircle,
    llm: IconAiBrain,
    mcp: IconLinkCircle,
    minimize: IconMinimizeSquare,
    pin: IconPin,
    play: IconPlay,
    plus: IconAddCircle,
    refresh: IconRefresh,
    search: IconMagnifer,
    settings: IconSettings,
    stop: IconStop,
    tool: IconCaseMinimalistic,
    trash: IconTrashBinMinimalistic,
    wrench: IconWrench,
    x: IconCloseCircle,
    'x-circle': IconCloseCircle,
} satisfies Record<string, Component>;

export const appIconFallback = IconInfoCircle;

export type AppIconName = keyof typeof appIconMap;
