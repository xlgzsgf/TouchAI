import type { Editor, JSONContent } from '@tiptap/core';
import { Extension, mergeAttributes, Node } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';

/* eslint-disable @typescript-eslint/no-explicit-any */

type SearchTagKind = 'model' | 'attachment';

export const SEARCH_TAG_SELECTOR = '[data-search-tag]';
export const SEARCH_TAG_CLOSE_SELECTOR = '[data-tag-close]';
export const SEARCH_TAG_INTERACTIVE_SELECTOR = `${SEARCH_TAG_SELECTOR}, ${SEARCH_TAG_CLOSE_SELECTOR}`;
export const DEFAULT_PLACEHOLDER = '写下你的需求...';

const MODEL_TAG_NODE = 'modelTag';
const ATTACHMENT_TAG_NODE = 'attachmentTag';

interface SearchTagNodeOptions {
    name: string;
    kind: SearchTagKind;
    parseTag: string;
    addAttributes: () => Record<string, { default: unknown }>;
    getRootAttributes?: (HTMLAttributes: Record<string, any>) => Record<string, any>;
    renderChildren: (HTMLAttributes: Record<string, any>) => any[];
}

function createTagCloseButton(kind: SearchTagKind) {
    return [
        'button',
        {
            class: `search-tag-close search-tag-close--${kind} ${kind}-tag-close`,
            'data-tag-close': '',
            type: 'button',
            contenteditable: 'false',
        },
        '×',
    ];
}

function createSearchTagNode(options: SearchTagNodeOptions) {
    return Node.create({
        name: options.name,
        group: 'inline',
        inline: true,
        atom: true,
        selectable: true,
        draggable: false,

        addAttributes() {
            return options.addAttributes();
        },

        parseHTML() {
            return [
                { tag: options.parseTag },
                { tag: `span[data-search-tag][data-search-tag-kind="${options.kind}"]` },
            ];
        },

        renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
            return [
                'span',
                mergeAttributes(
                    HTMLAttributes,
                    {
                        'data-search-tag': '',
                        'data-search-tag-kind': options.kind,
                        class: `search-tag-chip search-tag-chip--${options.kind} ${options.kind}-tag-chip`,
                        contenteditable: 'false',
                    },
                    options.getRootAttributes?.(HTMLAttributes) ?? {}
                ),
                [
                    'span',
                    { class: 'search-tag-content' },
                    ...options.renderChildren(HTMLAttributes),
                ],
            ];
        },
    });
}

export function findSearchTagChip(target: Element | null) {
    return target?.closest(SEARCH_TAG_SELECTOR) as HTMLElement | null;
}

export function isSearchTagDomTarget(target: Element | null) {
    return Boolean(target?.closest(SEARCH_TAG_INTERACTIVE_SELECTOR));
}

/** 判断目标是否为编辑器空白区域（editor host 或 tiptap 根元素）。 */
export function isBlankEditorAreaTarget(target: HTMLElement) {
    return (
        target.classList.contains('search-bar-editor-host') || target.classList.contains('tiptap')
    );
}

/** 从鼠标事件中解析目标 HTMLElement（兼容 Text 节点）。 */
export function resolveMouseEventTarget(event: MouseEvent): HTMLElement | null {
    const raw = event.target;
    return raw instanceof HTMLElement ? raw : raw instanceof Text ? raw.parentElement : null;
}

// ─── 自定义节点：模型标签 ─────────────────────────────────────────

export interface ModelTagAttrs {
    modelId: string;
    modelName: string;
    providerId: number | null;
}

const ModelTag = createSearchTagNode({
    name: MODEL_TAG_NODE,
    kind: 'model',
    parseTag: 'span[data-model-tag]',
    addAttributes() {
        return {
            modelId: { default: null },
            modelName: { default: null },
            providerId: { default: null },
        };
    },
    getRootAttributes(HTMLAttributes) {
        return {
            'data-model-tag': '',
            'data-model-id': HTMLAttributes.modelId || '',
        };
    },
    renderChildren(HTMLAttributes) {
        return [
            [
                'span',
                { class: 'search-tag-label search-tag-label--model model-tag-text' },
                `@${HTMLAttributes.modelName || ''}`,
            ],
            createTagCloseButton('model'),
        ];
    },
});

// ─── 自定义节点：附件标签 ─────────────────────────────────────────

export interface AttachmentTagAttrs {
    attachmentId: string;
    fileName: string;
    fileType: 'image' | 'file';
    preview?: string;
}

const AttachmentTag = createSearchTagNode({
    name: ATTACHMENT_TAG_NODE,
    kind: 'attachment',
    parseTag: 'span[data-attachment-tag]',
    addAttributes() {
        return {
            attachmentId: { default: null },
            fileName: { default: null },
            fileType: { default: 'file' },
            preview: { default: null },
        };
    },
    getRootAttributes(HTMLAttributes) {
        const isImage = HTMLAttributes.fileType === 'image';
        const name = HTMLAttributes.fileName || 'file';
        return {
            'data-attachment-tag': '',
            'data-attachment-id': HTMLAttributes.attachmentId || '',
            class: isImage ? 'search-tag-chip--image attachment-tag-chip-image' : '',
            title: name,
        };
    },
    renderChildren(HTMLAttributes) {
        const isImage = HTMLAttributes.fileType === 'image';
        const name = HTMLAttributes.fileName || 'file';
        const truncated = name.length > 12 ? name.slice(0, 10) + '…' : name;

        const children: any[] = [];

        if (HTMLAttributes.preview) {
            children.push([
                'img',
                {
                    src: HTMLAttributes.preview,
                    class: 'attachment-tag-preview',
                    alt: name,
                },
            ]);
        }

        if (!isImage) {
            children.push([
                'span',
                { class: 'search-tag-label search-tag-label--attachment attachment-tag-name' },
                truncated,
            ]);
        }

        children.push(createTagCloseButton('attachment'));
        return children;
    },
});

// ─── 节点同步插件 ─────────────────────────────────────────────────

interface NodeSyncCallbacks {
    onModelTagRemoved?: () => void;
    onAttachmentTagRemoved?: (attachmentId: string) => void;
}

const nodeSyncPluginKey = new PluginKey('nodeSync');
const tagRangeSelectionPluginKey = new PluginKey('tagRangeSelection');

function createNodeSyncPlugin(callbacks: NodeSyncCallbacks) {
    return new Plugin({
        key: nodeSyncPluginKey,
        appendTransaction(
            transactions: readonly Transaction[],
            oldState: EditorState,
            newState: EditorState
        ) {
            // 仅在文档发生变化时检查
            if (!transactions.some((tr) => tr.docChanged)) return null;

            // 收集新旧状态中的节点 ID
            const oldModelIds = new Set<string>();
            const newModelIds = new Set<string>();
            const oldAttachmentIds = new Set<string>();
            const newAttachmentIds = new Set<string>();

            oldState.doc.descendants((node: PmNode) => {
                if (node.type.name === MODEL_TAG_NODE) {
                    oldModelIds.add(node.attrs.modelId);
                }
                if (node.type.name === ATTACHMENT_TAG_NODE) {
                    oldAttachmentIds.add(node.attrs.attachmentId);
                }
            });

            newState.doc.descendants((node: PmNode) => {
                if (node.type.name === MODEL_TAG_NODE) {
                    newModelIds.add(node.attrs.modelId);
                }
                if (node.type.name === ATTACHMENT_TAG_NODE) {
                    newAttachmentIds.add(node.attrs.attachmentId);
                }
            });

            // 检测被移除的节点
            for (const id of oldModelIds) {
                if (!newModelIds.has(id)) {
                    callbacks.onModelTagRemoved?.();
                }
            }

            for (const id of oldAttachmentIds) {
                if (!newAttachmentIds.has(id)) {
                    callbacks.onAttachmentTagRemoved?.(id);
                }
            }

            return null;
        },
    });
}

const NodeSyncExtension = Extension.create<NodeSyncCallbacks>({
    name: 'nodeSync',

    addOptions() {
        return {
            onModelTagRemoved: undefined,
            onAttachmentTagRemoved: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [createNodeSyncPlugin(this.options), createTagRangeSelectionPlugin()];
    },
});

function isTagNode(node: PmNode | null | undefined) {
    return node?.type.name === MODEL_TAG_NODE || node?.type.name === ATTACHMENT_TAG_NODE;
}

function removeTagByChip(editor: Editor, chip: HTMLElement) {
    const kind = chip.getAttribute('data-search-tag-kind');

    if (kind === 'model') {
        removeModelTag(editor);
        return true;
    }

    if (kind === 'attachment') {
        const attachmentId = chip.getAttribute('data-attachment-id');
        if (attachmentId) {
            removeAttachmentTag(editor, attachmentId);
            return true;
        }
    }

    return false;
}

/**
 * 创建范围选区装饰插件。
 * 当用户拖拽选区跨越原子标签节点时，为被选中的标签添加视觉高亮样式，
 * 因为原子节点无法被浏览器原生 ::selection 样式覆盖。
 */
function createTagRangeSelectionPlugin() {
    return new Plugin({
        key: tagRangeSelectionPluginKey,
        props: {
            decorations(state) {
                const { doc, selection } = state;
                if (selection.empty || selection instanceof NodeSelection) {
                    return null;
                }

                const decorations: Decoration[] = [];
                doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                    if (isTagNode(node)) {
                        decorations.push(
                            Decoration.node(pos, pos + node.nodeSize, {
                                class: 'search-tag-range-selected',
                            })
                        );
                    }
                });

                if (!decorations.length) {
                    return null;
                }

                return DecorationSet.create(doc, decorations);
            },
        },
    });
}

/** 若光标前方紧邻一个标签节点，返回该标签的起始位置。 */
function getTagStartBeforeCursor(doc: PmNode, from: number) {
    const $from = doc.resolve(from);
    const nodeBefore = $from.nodeBefore;
    if (!nodeBefore || !isTagNode(nodeBefore)) {
        return null;
    }

    return from - nodeBefore.nodeSize;
}

/** 若光标后方紧邻一个标签节点，返回该标签的结束位置。 */
function getTagEndAfterCursor(doc: PmNode, from: number) {
    const $from = doc.resolve(from);
    const nodeAfter = $from.nodeAfter;
    if (!nodeAfter || !isTagNode(nodeAfter)) {
        return null;
    }

    return from + nodeAfter.nodeSize;
}

/** 当前选区为标签 NodeSelection 时，删除该标签。 */
function removeSelectedTag(editor: Editor) {
    const { selection } = editor.state;
    if (!(selection instanceof NodeSelection) || !isTagNode(selection.node)) {
        return false;
    }

    return editor.commands.command(({ tr }: { tr: Transaction; state: EditorState }) => {
        tr.delete(selection.from, selection.to);
        return true;
    });
}

/** 光标紧贴标签右侧时，Backspace 删除光标前方的标签。 */
function removeTagBeforeCursor(editor: Editor) {
    const { selection } = editor.state;
    if (!selection.empty) {
        return false;
    }

    const from = selection.from;
    const tagStart = getTagStartBeforeCursor(editor.state.doc, from);
    if (tagStart == null) {
        return false;
    }

    return editor.commands.command(({ tr }: { tr: Transaction }) => {
        tr.delete(tagStart, from);
        return true;
    });
}

/**
 * Shift+Arrow 跨标签扩展选区。
 * 标签为原子节点，ProseMirror 默认无法将选区延伸穿过它，
 * 此函数手动将 selection.head 跳过标签的整个宽度。
 */
function extendSelectionAcrossTag(editor: Editor, direction: 'left' | 'right') {
    const { doc, selection } = editor.state;

    if (selection instanceof NodeSelection && isTagNode(selection.node)) {
        const anchor = direction === 'left' ? selection.to : selection.from;
        const head = direction === 'left' ? selection.from : selection.to;

        return editor.commands.command(({ tr }: { tr: Transaction }) => {
            tr.setSelection(TextSelection.create(tr.doc, anchor, head));
            return true;
        });
    }

    const target =
        direction === 'left'
            ? getTagStartBeforeCursor(doc, selection.head)
            : getTagEndAfterCursor(doc, selection.head);

    if (target == null) {
        return false;
    }

    return editor.commands.command(({ tr }: { tr: Transaction }) => {
        tr.setSelection(TextSelection.create(tr.doc, selection.anchor, target));
        return true;
    });
}

/**
 * Arrow 键跨标签移动光标。
 * 标签为原子节点，光标无法停留在其内部；
 * 碰到标签时直接跳到标签的另一端。
 */
function moveCursorAcrossTag(editor: Editor, direction: 'left' | 'right') {
    const { doc, selection } = editor.state;

    if (selection instanceof NodeSelection && isTagNode(selection.node)) {
        const target = direction === 'left' ? selection.from : selection.to;
        return editor.commands.command(({ tr }: { tr: Transaction }) => {
            tr.setSelection(TextSelection.create(tr.doc, target));
            return true;
        });
    }

    if (!selection.empty) {
        return false;
    }

    const from = selection.from;

    if (direction === 'right') {
        const target = getTagEndAfterCursor(doc, from);
        if (target == null) {
            return selection.$head.parentOffset === selection.$head.parent.content.size;
        }

        return editor.commands.command(({ tr }: { tr: Transaction }) => {
            tr.setSelection(TextSelection.create(tr.doc, target));
            return true;
        });
    }

    const target = getTagStartBeforeCursor(doc, from);
    if (target == null) {
        return selection.$head.parentOffset === 0;
    }

    return editor.commands.command(({ tr }: { tr: Transaction }) => {
        tr.setSelection(TextSelection.create(tr.doc, target));
        return true;
    });
}

// ─── 搜索键盘快捷键 ─────────────────────────────────────────────

const SearchKeyboard = Extension.create({
    name: 'searchKeyboard',

    addKeyboardShortcuts() {
        return {
            Enter: () => {
                // 阻止 ProseMirror 创建新段落；提交/转发由外层捕获阶段监听处理
                return true;
            },
            'Shift-Enter': ({ editor }: { editor: Editor }) => {
                return editor.commands.setHardBreak();
            },
            Backspace: ({ editor }: { editor: Editor }) => {
                return removeSelectedTag(editor) || removeTagBeforeCursor(editor);
            },
            ArrowLeft: ({ editor }: { editor: Editor }) => {
                return moveCursorAcrossTag(editor, 'left');
            },
            ArrowRight: ({ editor }: { editor: Editor }) => {
                return moveCursorAcrossTag(editor, 'right');
            },
            'Shift-ArrowLeft': ({ editor }: { editor: Editor }) => {
                return extendSelectionAcrossTag(editor, 'left');
            },
            'Shift-ArrowRight': ({ editor }: { editor: Editor }) => {
                return extendSelectionAcrossTag(editor, 'right');
            },
        };
    },
});

// ─── 扩展工厂 ─────────────────────────────────────────────────────

export interface CreateSearchEditorOptions {
    placeholder?: string;
    onModelTagRemoved?: () => void;
    onAttachmentTagRemoved?: (attachmentId: string) => void;
}

/**
 * 创建搜索编辑器的 Tiptap 扩展列表。
 * 返回扩展数组，传给 `new Editor({ extensions })`。
 */
export function createSearchEditorExtensions(options: CreateSearchEditorOptions) {
    const { placeholder, onModelTagRemoved, onAttachmentTagRemoved } = options;

    return [
        StarterKit.configure({
            bold: false,
            italic: false,
            strike: false,
            code: false,
            codeBlock: false,
            heading: false,
            bulletList: false,
            orderedList: false,
            listItem: false,
            blockquote: false,
            horizontalRule: false,
            dropcursor: false,
            gapcursor: false,
            // 保留：document、paragraph、text、hardBreak、history
        }),
        Placeholder.configure({
            placeholder: placeholder || DEFAULT_PLACEHOLDER,
        }),
        ModelTag,
        AttachmentTag,
        NodeSyncExtension.configure({
            onModelTagRemoved,
            onAttachmentTagRemoved,
        }),
        SearchKeyboard,
    ];
}

// ─── 辅助函数 ─────────────────────────────────────────────────────

/** 从编辑器中提取纯文本，排除标签内容。 */
export function getEditorText(editor: Editor): string {
    return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '');
}

/**
 * 检查编辑器内容是否为纯文本（不含任何自定义节点）。
 * 只允许 doc / paragraph / text 三种基础节点；
 * 任何自定义原子节点（模型标签、附件标签等）均视为非纯文本。
 *
 * @param editor Tiptap 编辑器实例。
 * @returns 仅含基础节点时为 true。
 */
export function isPlainText(editor: Editor): boolean {
    let plain = true;
    editor.state.doc.descendants((node) => {
        if (node.isText || node.type.name === 'doc' || node.type.name === 'paragraph') {
            return;
        }
        plain = false;
        // 返回 false 终止 ProseMirror descendants 遍历，提前退出。
        return false;
    });
    return plain;
}

export function getModelTag(editor: Editor): ModelTagAttrs | null {
    // 模型标签始终插入在 position 1（首段起始），直接定位而非遍历。
    const node = editor.state.doc.nodeAt(1);
    if (node && node.type.name === MODEL_TAG_NODE) {
        return {
            modelId: node.attrs.modelId,
            modelName: node.attrs.modelName,
            providerId: node.attrs.providerId,
        };
    }
    return null;
}

/** 插入模型标签（先移除已有的）。 */
export function insertModelTag(editor: Editor, attrs: ModelTagAttrs) {
    removeModelTag(editor);

    editor
        .chain()
        .focus()
        .command(({ tr, state }: { tr: Transaction; state: EditorState }) => {
            const modelTagType = state.schema.nodes.modelTag;
            if (!modelTagType) return false;

            const node = modelTagType.create(attrs);
            tr.insert(1, node);
            tr.setSelection(TextSelection.create(tr.doc, 1 + node.nodeSize));
            return true;
        })
        .run();
}

export function removeModelTag(editor: Editor) {
    editor.commands.command(({ tr, state }: { tr: Transaction; state: EditorState }) => {
        // 模型标签始终在 position 1，直接定位删除。
        const node = state.doc.nodeAt(1);
        if (node && node.type.name === MODEL_TAG_NODE) {
            tr.delete(1, 1 + node.nodeSize);
            return true;
        }
        return false;
    });
}

export function insertAttachmentTag(editor: Editor, attrs: AttachmentTagAttrs) {
    editor
        .chain()
        .focus('end')
        .command(({ tr, state }: { tr: Transaction; state: EditorState }) => {
            const attachmentTagType = state.schema.nodes.attachmentTag;
            if (!attachmentTagType) return false;
            const node = attachmentTagType.create(attrs);
            const pos = state.selection.to;
            tr.insert(pos, node);
            tr.setSelection(TextSelection.create(tr.doc, pos + node.nodeSize));
            return true;
        })
        .run();
}

/** 按 ID 移除附件标签。 */
export function removeAttachmentTag(editor: Editor, attachmentId: string) {
    editor.commands.command(({ tr, state }: { tr: Transaction; state: EditorState }) => {
        let found = false;
        state.doc.descendants((node: PmNode, pos: number) => {
            if (
                node.type.name === ATTACHMENT_TAG_NODE &&
                node.attrs.attachmentId === attachmentId &&
                !found
            ) {
                tr.delete(pos, pos + node.nodeSize);
                found = true;
            }
        });
        return found;
    });
}

/** 判断光标是否在文档起始位置。 */
export function isCursorAtDocStart(editor: Editor): boolean {
    const { from, to } = editor.state.selection;
    return from <= 1 && to <= 1;
}

export function getEditorJSON(editor: Editor): JSONContent {
    return editor.getJSON();
}

/** 从 JSON 恢复编辑器内容。 */
export function setEditorJSON(editor: Editor, json: JSONContent) {
    editor.commands.setContent(json);
}

/** 清空编辑器内容（可选保留模型标签）。 */
export function clearEditor(editor: Editor, options?: { preserveModelTag?: boolean }) {
    if (!options?.preserveModelTag) {
        editor.commands.clearContent(true);
        return;
    }

    const modelTag = getModelTag(editor);
    if (!modelTag) {
        editor.commands.clearContent(true);
        return;
    }

    editor.commands.setContent(
        {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: MODEL_TAG_NODE,
                            attrs: modelTag,
                        },
                    ],
                },
            ],
        },
        { emitUpdate: true }
    );
    editor.commands.focus('end');
}

// ─── 标签关闭按钮点击处理 ────────────────────────────────────────

/**
 * 将标签 DOM 元素对应的 ProseMirror 节点选中为 NodeSelection。
 * posAtDOM 返回的位置可能略有偏差，因此先尝试 nodeAt，再 fallback 到 nodeBefore。
 */
function selectTagNode(editor: Editor, chip: HTMLElement) {
    try {
        const { state, view } = editor;
        const pos = view.posAtDOM(chip, 0);
        let node = state.doc.nodeAt(pos) ?? state.doc.resolve(pos).nodeAfter;
        let nodePos = pos;

        if (!node || !isTagNode(node)) {
            const resolved = state.doc.resolve(pos);
            node = resolved.nodeBefore;
            if (!node || !isTagNode(node)) {
                return false;
            }
            nodePos = pos - node.nodeSize;
        }

        view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, nodePos)));
        view.focus();
        return true;
    } catch {
        return false;
    }
}

export function handleEditorClick(editor: Editor, event: MouseEvent) {
    const target = resolveMouseEventTarget(event);

    if (!target) {
        return;
    }

    if (target.closest(SEARCH_TAG_CLOSE_SELECTOR)) {
        event.preventDefault();
        event.stopPropagation();
        const chip = findSearchTagChip(target);
        if (chip) {
            removeTagByChip(editor, chip);
        }
        return;
    }

    const chip = findSearchTagChip(target);
    if (chip) {
        const { selection } = editor.state;
        if (!selection.empty && !(selection instanceof NodeSelection)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        selectTagNode(editor, chip);
    }
}
