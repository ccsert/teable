import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { EditorState, StateField, StateEffect, RangeSet } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { EditorView, keymap, Decoration, WidgetType } from '@codemirror/view';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@teable/ui-lib';
import { Maximize2, MoreHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorExtensions } from './EditorExtensions';
import { FieldSelector } from './FieldSelector';
import { PromptOptimizer } from './PromptOptimizer';

interface ICodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  height?: string;
}

// 添加字段标记的装饰效果
const fieldMark = Decoration.mark({ class: 'cm-field-mark' });

// 添加字段装饰器类
class FieldWidget extends WidgetType {
  constructor(
    readonly fieldId: string,
    readonly fieldName: string,
    readonly onDelete: (from: number, to: number) => void,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  toDOM() {
    const wrapper = document.createElement('span');
    wrapper.className =
      'inline-flex h-5 items-center gap-0.5 rounded bg-blue-50 px-1.5 text-xs font-medium text-blue-700 cursor-default select-none hover:bg-blue-100 relative';
    wrapper.setAttribute('data-field-id', this.fieldId);
    wrapper.setAttribute('data-field-range', `${this.from},${this.to}`);
    wrapper.style.verticalAlign = 'middle';

    const textSpan = document.createElement('span');
    textSpan.textContent = this.fieldName;
    textSpan.className = 'max-w-[120px] truncate';
    wrapper.appendChild(textSpan);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className =
      'inline-flex items-center justify-center size-3 hover:bg-blue-200 rounded-sm transition-colors';
    deleteButton.innerHTML = `
      <svg class="size-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    `;
    deleteButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.onDelete(this.from, this.to);
    });
    wrapper.appendChild(deleteButton);

    return wrapper;
  }

  eq(other: FieldWidget) {
    return (
      this.fieldId === other.fieldId &&
      this.fieldName === other.fieldName &&
      this.from === other.from &&
      this.to === other.to
    );
  }
}

// 添加字段装饰效果
const addField = StateEffect.define<{
  from: number;
  to: number;
  fieldId: string;
  fieldName: string;
}>();

// 添加一个新的纯编辑器组件
type EditorViewRef = { current: EditorView | null };

const PureEditor = ({
  value,
  onChange,
  placeholder,
  height = '120px',
  maxHeight = '300px',
  fields = [],
  editorViewRef,
  className,
}: Omit<ICodeMirrorEditorProps, 'className'> & {
  fields?: { id: string; name: string }[];
  editorViewRef?: EditorViewRef;
  className?: string;
  maxHeight?: string;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const internalEditorViewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const lastValueRef = useRef(value);

  // 使用传入的 ref 或内部 ref
  const actualEditorViewRef = editorViewRef || internalEditorViewRef;

  // 添加字段删除检测函数
  const findFieldAtPos = useCallback((doc: EditorState['doc'], pos: number) => {
    let start = pos;
    while (start > 0) {
      const ch = doc.slice(start - 1, start).toString();
      if (ch === '{') {
        let end = start;
        let depth = 1;
        while (end < doc.length) {
          const nextCh = doc.slice(end, end + 1).toString();
          if (nextCh === '}' && --depth === 0) {
            return { start: start - 1, end: end + 1 };
          }
          end++;
        }
      }
      start--;
    }
    return null;
  }, []);

  // 修改删除处理函数
  const handleFieldDelete = useCallback((from: number, to: number) => {
    if (!actualEditorViewRef.current) return;

    const view = actualEditorViewRef.current;
    view.dispatch({
      changes: { from, to, insert: '' },
      selection: { anchor: from },
    });
    view.focus();
  }, []);

  // 处理字段装饰
  const decorateFields = useCallback(
    (view: EditorView) => {
      const effects: StateEffect<unknown>[] = [];
      const text = view.state.doc.toString();
      const fieldPattern = /\{([^}]+)\}/g;
      let match;

      while ((match = fieldPattern.exec(text)) !== null) {
        const fieldId = match[1];
        const field = fields.find((f) => f.id === fieldId);
        if (field) {
          effects.push(
            addField.of({
              from: match.index,
              to: match.index + match[0].length,
              fieldId: field.id,
              fieldName: field.name,
            })
          );
        }
      }

      if (effects.length > 0) {
        view.dispatch({ effects });
      }
    },
    [fields]
  );

  // 移动到组件内部
  const fieldDecorationsState = useMemo(
    () =>
      StateField.define<DecorationSet>({
        create() {
          return Decoration.none;
        },
        update(decorations, tr) {
          decorations = decorations.map(tr.changes);
          for (const e of tr.effects) {
            if (e.is(addField)) {
              decorations = decorations.update({
                add: [
                  Decoration.replace({
                    widget: new FieldWidget(
                      e.value.fieldId,
                      e.value.fieldName,
                      handleFieldDelete,
                      e.value.from,
                      e.value.to
                    ),
                  }).range(e.value.from, e.value.to),
                ],
              });
            }
          }
          return decorations;
        },
        provide: (f) => EditorView.decorations.from(f),
      }),
    [handleFieldDelete]
  );

  const createEditorView = useCallback(
    (parent: HTMLElement) => {
      const extensions = [
        history(),
        keymap.of([
          ...defaultKeymap.filter(
            (k) => !['Backspace', 'ArrowLeft', 'ArrowRight'].includes(k.key!)
          ),
          ...historyKeymap,
          {
            key: 'Backspace',
            run: (view) => {
              const { from } = view.state.selection.main;
              if (from === 0) return false;

              // 先检查是否在字段内部
              const text = view.state.doc.toString();
              const beforeCursor = text.slice(0, from);
              const lastOpenBrace = beforeCursor.lastIndexOf('{');
              const lastCloseBrace = beforeCursor.lastIndexOf('}');

              if (lastOpenBrace > lastCloseBrace) {
                // 光标在字段内部，执行普通退格
                return false;
              }

              // 检查是否在字段后面
              const field = findFieldAtPos(view.state.doc, from);
              if (field && field.end === from) {
                handleFieldDelete(field.start, field.end);
                return true;
              }

              // 默认行为
              return false;
            },
          },
          {
            key: 'ArrowLeft',
            run: (view) => {
              const { from } = view.state.selection.main;
              const field = findFieldAtPos(view.state.doc, from);
              if (field && field.end === from) {
                // 如果光标在字段后面，直接跳到字段前面
                view.dispatch({
                  selection: { anchor: field.start },
                });
                return true;
              }
              return false;
            },
          },
          {
            key: 'ArrowRight',
            run: (view) => {
              const { from } = view.state.selection.main;
              const text = view.state.doc.toString();
              if (text[from] === '{') {
                // 如果光标在字段开始位置，找到对应的结束位置
                let depth = 1;
                let pos = from + 1;
                while (pos < text.length) {
                  if (text[pos] === '}' && --depth === 0) {
                    view.dispatch({
                      selection: { anchor: pos + 1 },
                    });
                    return true;
                  }
                  if (text[pos] === '{') depth++;
                  pos++;
                }
              }
              return false;
            },
          },
        ]),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        fieldDecorationsState, // 使用 memo 化的装饰状态
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString();
            lastValueRef.current = newValue;
            onChange(newValue);
            // 更新字段装饰
            decorateFields(update.view);
          }
        }),
        EditorView.theme({
          '&': {
            height,
            fontSize: '14px',
            maxHeight,
          },
          '.cm-content': {
            fontFamily: 'monospace',
            padding: '12px 16px',
            minHeight: height,
            height: '100%',
            caretColor: 'black',
          },
          '.cm-scroller': {
            overflow: 'auto',
            lineHeight: '1.6',
            maxHeight,
          },
          '&.cm-focused': {
            outline: '2px solid rgb(var(--color-primary) / 0.2)',
            outlineOffset: '-1px',
          },
          '.cm-line': {
            padding: '3px 0',
          },
          '&.cm-editor': {
            backgroundColor: 'white',
            borderRadius: '0.5rem',
          },
        }),
        EditorView.lineWrapping,
        EditorState.allowMultipleSelections.of(true),
        placeholder ? EditorView.contentAttributes.of({ 'data-placeholder': placeholder }) : [],
        EditorState.tabSize.of(2),
      ];

      const view = new EditorView({
        state: EditorState.create({ doc: value, extensions }),
        parent,
      });

      // 初始化字段装饰
      requestAnimationFrame(() => {
        decorateFields(view);
      });

      return view;
    },
    [
      value,
      onChange,
      height,
      maxHeight,
      placeholder,
      decorateFields,
      fieldDecorationsState,
      findFieldAtPos,
      handleFieldDelete,
    ]
  );

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current) return;

    const view = createEditorView(editorRef.current);
    setEditorView(view);
    actualEditorViewRef.current = view;
    lastValueRef.current = value;

    return () => {
      view.destroy();
    };
  }, []); // 只在组件挂载时初始化一次

  // 修改外部值更新处理
  useEffect(() => {
    if (!editorView || value === lastValueRef.current) return;

    const currentDoc = editorView.state.doc.toString();
    if (currentDoc !== value) {
      const selection = editorView.state.selection;
      editorView.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
        selection,
      });
      lastValueRef.current = value;

      // 确保字段装饰被重新应用
      requestAnimationFrame(() => {
        decorateFields(editorView);
      });
    }
  }, [value, editorView, decorateFields]);

  return (
    <div className="h-full">
      <style>
        {`
          .cm-editor [data-placeholder]:empty::before {
            content: attr(data-placeholder);
            color: #999;
            pointer-events: none;
            position: absolute;
            padding: 12px 16px;
            font-size: 14px;
            height: 36px;
            line-height: 36px;
            max-width: calc(100% - 140px); /* 为右侧按钮预留空间 */
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .cm-editor {
            height: 100%;
          }
          .cm-editor.cm-focused {
            outline: 2px solid rgb(var(--color-primary) / 0.2);
            outline-offset: -1px;
          }
          .cm-cursor {
            border-left: 1.2px solid black;
            border-right: none;
            width: 0;
          }
          .cm-content {
            line-height: 1.6;
            padding-top: 12px !important;
          }
          .cm-line {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            min-height: 1.6em;
          }
          .cm-field-mark {
            background: transparent;
            cursor: default;
            display: inline-flex;
            align-items: center;
          }
          .cm-line {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 1px;
          }
        `}
      </style>
      <div
        ref={editorRef}
        className="h-full cursor-text rounded-lg border border-gray-200 shadow-sm focus-within:border-primary hover:border-gray-400"
      />
    </div>
  );
};

export const CodeMirrorEditor = (
  props: ICodeMirrorEditorProps & {
    isFullscreen?: boolean;
    fields?: { id: string; name: string }[];
    enableFieldSelector?: boolean;
    currentFieldId?: string;
    disablePromptOptimizer?: boolean;
    label?: string;
    hideHeader?: boolean;
  }
) => {
  const [showDialog, setShowDialog] = useState(false);
  const mainEditorViewRef = useRef<EditorView | null>(null) as EditorViewRef;
  const dialogEditorViewRef = useRef<EditorView | null>(null) as EditorViewRef;

  const handleFieldInsert = useCallback(
    (field: { id: string; name: string }) => {
      const fieldMark = `{${field.id}}`;
      const view = showDialog ? dialogEditorViewRef.current : mainEditorViewRef.current;

      if (view) {
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: fieldMark },
          selection: { anchor: from + fieldMark.length },
        });
        view.focus();
      }
    },
    [showDialog]
  );

  return (
    <>
      <div
        className={`group flex flex-col overflow-hidden rounded-lg border border-gray-200 shadow-sm focus-within:border-primary hover:border-gray-400 ${
          props.className || ''
        }`}
      >
        {props.label && (
          <div className="flex h-9 items-center justify-between border-b border-gray-100 bg-gray-50/50 px-3">
            <div className="flex items-center">
              <div className="text-sm font-medium text-gray-700">{props.label}</div>
            </div>
            <EditorExtensions
              {...props}
              onFullscreen={() => setShowDialog(true)}
              onFieldSelect={handleFieldInsert}
            />
          </div>
        )}
        <div className="flex-1">
          <PureEditor {...props} editorViewRef={mainEditorViewRef} maxHeight="300px" />
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="flex max-w-[80vw] flex-col">
          <DialogHeader className="flex-none flex-row items-center justify-between">
            <DialogTitle>编辑提示词</DialogTitle>
            <EditorExtensions {...props} isFullscreen={true} onFieldSelect={handleFieldInsert} />
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <PureEditor
              {...props}
              height="100%"
              maxHeight="60vh"
              editorViewRef={dialogEditorViewRef}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
