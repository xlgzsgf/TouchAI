// Copyright (c) 2026. 千诚. Licensed under GPL v3

/**
 * Type declarations for markdown-it plugins
 */

declare module 'markdown-it-abbr' {
    import type MarkdownIt from 'markdown-it';
    const abbr: MarkdownIt.PluginSimple;
    export default abbr;
}

declare module 'markdown-it-deflist' {
    import type MarkdownIt from 'markdown-it';
    const deflist: MarkdownIt.PluginSimple;
    export default deflist;
}

declare module 'markdown-it-ins' {
    import type MarkdownIt from 'markdown-it';
    const ins: MarkdownIt.PluginSimple;
    export default ins;
}

declare module 'markdown-it-mark' {
    import type MarkdownIt from 'markdown-it';
    const mark: MarkdownIt.PluginSimple;
    export default mark;
}

declare module 'markdown-it-sub' {
    import type MarkdownIt from 'markdown-it';
    const sub: MarkdownIt.PluginSimple;
    export default sub;
}

declare module 'markdown-it-sup' {
    import type MarkdownIt from 'markdown-it';
    const sup: MarkdownIt.PluginSimple;
    export default sup;
}

declare module 'markdown-it-task-lists' {
    import type MarkdownIt from 'markdown-it';
    interface TaskListsOptions {
        enabled?: boolean;
        label?: boolean;
        labelAfter?: boolean;
    }
    const taskLists: MarkdownIt.PluginWithOptions<TaskListsOptions>;
    export default taskLists;
}

declare module '@vscode/markdown-it-katex' {
    import type MarkdownIt from 'markdown-it';
    const katex: MarkdownIt.PluginSimple;
    export default katex;
}
