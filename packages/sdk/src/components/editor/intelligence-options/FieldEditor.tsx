import { Label } from '@teable/ui-lib';
import { debounce } from 'lodash';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useFields } from '../../../hooks';
import { FieldSelector } from './components/FieldSelector';

interface IFieldEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  enableFieldSelector?: boolean;
  label?: string;
  currentFieldId?: string;
  onFieldsChange?: (fieldIds: string[]) => void;
}

interface IFieldNode {
  id: string;
  name: string;
}

// 新增光标位置保存和恢复的工具函数
interface ICursorPosition {
  offset: number;
  node: Node | null;
}

const saveCursorPosition = (editor: HTMLElement): ICursorPosition | null => {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;

  return {
    offset: range.startOffset,
    node: range.startContainer,
  };
};

const restoreCursorPosition = (editor: HTMLElement, position: ICursorPosition | null) => {
  if (!position?.node) return;

  try {
    const range = document.createRange();
    range.setStart(position.node, position.offset);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } catch (e) {
    console.debug('Failed to restore cursor position:', e);
  }
};

export const FieldEditor = ({
  value,
  onChange,
  placeholder,
  enableFieldSelector = true,
  label,
  currentFieldId,
  onFieldsChange,
}: IFieldEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fields = useFields({ withHidden: true, withDenied: true });
  const [isComposing, setIsComposing] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  // 添加新的工具函数来安全地处理HTML内容
  const sanitizeHtml = (html: string) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  };

  // 优化 createFieldSpan 函数
  const createFieldSpan = (field: IFieldNode) => {
    const span = document.createElement('span');
    span.className =
      'inline-flex h-6 items-center gap-1 rounded bg-blue-50 px-1.5 text-xs font-medium text-blue-700 cursor-default mx-0.5 select-none';
    span.contentEditable = 'false';
    span.dataset.fieldId = field.id;
    span.dataset.fieldName = field.name;

    const textNode = document.createTextNode(field.name);
    span.appendChild(textNode);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ml-0.5 rounded-sm hover:bg-blue-100 p-0.5 delete-field';
    button.dataset.fieldId = field.id;

    const svg = `<svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>`;
    button.innerHTML = svg;

    span.appendChild(button);

    const temp = document.createElement('div');
    temp.appendChild(span);
    return temp.innerHTML;
  };

  // 将 contentToHtml 改为 useCallback
  const contentToHtml = useCallback(
    (content: string): string => {
      if (!content) return '';

      // 先处理换行符
      const htmlWithLineBreaks = content.replace(/\n/g, '<br>');

      // 再处理字段标记
      const fieldMap = new Map(fields?.map((f) => [f.id, f]) || []);
      return htmlWithLineBreaks.replace(/\{([^}]+)\}/g, (match, fieldId) => {
        const field = fieldMap.get(fieldId);
        if (field) {
          return createFieldSpan(field);
        }
        // 如果找不到对应的字段，将其显示为普通文本标记
        const span = document.createElement('span');
        span.className =
          'inline-flex h-6 items-center gap-1 rounded bg-gray-100 px-1.5 text-xs font-medium text-gray-700 cursor-default mx-0.5 select-none';
        span.contentEditable = 'false';
        span.textContent = match;
        const temp = document.createElement('div');
        temp.appendChild(span);
        return temp.innerHTML;
      });
    },
    [fields]
  );

  // 将 HTML 转换回内容字符串
  const htmlToContent = (element: HTMLElement): string => {
    let content = '';
    const nodes = Array.from(element.childNodes);

    nodes.forEach((node, index) => {
      if (node.nodeType === Node.TEXT_NODE) {
        content += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-field-id')) {
          content += `{${el.getAttribute('data-field-id')}}`;
        } else if (el.tagName.toLowerCase() === 'br') {
          content += '\n';
        } else if (el.tagName.toLowerCase() === 'div' && index > 0) {
          // 对于 div 标签，如果不是第一个元素，添加换行符
          content += '\n' + (el.textContent || '');
        } else {
          content += el.textContent || '';
        }
      }
    });

    return content;
  };

  // 初始化和更新内容
  useEffect(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const isEditorFocused = editorRef.current.contains(range?.commonAncestorContainer || null);

    const html = contentToHtml(value);
    if (editorRef.current.innerHTML !== html) {
      const startContainer = range?.startContainer;
      const startOffset = range?.startOffset;

      editorRef.current.innerHTML = html;

      if (
        isEditorFocused &&
        startContainer &&
        startOffset !== undefined &&
        selection &&
        startContainer !== null
      ) {
        try {
          restoreCursorPosition(editorRef.current, {
            node: startContainer,
            offset: startOffset ?? 0,
          });
        } catch (e) {
          console.debug('Failed to restore cursor position:', e);
        }
      }
    }
  }, [value, fields, contentToHtml]);

  // 优化更新逻辑
  const updateValue = useCallback(
    (force = false) => {
      if (!editorRef.current || (!force && isComposing)) return;

      const newContent = htmlToContent(editorRef.current);
      if (newContent !== value) {
        onChange(newContent);

        // 提取所有使用的字段 ID
        const usedFieldIds = Array.from(newContent.matchAll(/\{([^}]+)\}/g))
          .map((match) => match[1])
          .filter((id, index, self) => self.indexOf(id) === index); // 去重

        // 通知父组件字段变化
        onFieldsChange?.(usedFieldIds);
      }
    },
    [isComposing, onChange, value, onFieldsChange]
  );

  // 使用 useCallback 优化事件处理函数
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
    requestAnimationFrame(() => {
      updateValue(true);
    });
  }, [updateValue]);

  // 使用防抖处理输入更新
  const debouncedUpdate = useRef(
    debounce(() => {
      updateValue();
    }, 100)
  ).current;

  const handleInput = useCallback(() => {
    if (!isComposing) {
      debouncedUpdate();
    }
  }, [isComposing, debouncedUpdate]);

  // 优化字段删除逻辑
  const handleFieldDelete = useCallback(
    (e: MouseEvent, fieldId: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (!editorRef.current) return;

      const fieldElement = editorRef.current.querySelector(`[data-field-id="${fieldId}"]`);
      if (fieldElement) {
        const cursorPosition = saveCursorPosition(editorRef.current);
        fieldElement.remove();
        updateValue(true);
        requestAnimationFrame(() => {
          restoreCursorPosition(editorRef.current!, cursorPosition);
        });
      }
    },
    [updateValue]
  );

  // 优化字段插入逻辑
  const insertField = useCallback(
    (field: IFieldNode) => {
      if (!editorRef.current) return;

      const selection = window.getSelection();
      if (!selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      const isEditorFocused = editorRef.current.contains(range.commonAncestorContainer);

      if (!isEditorFocused) {
        const newRange = document.createRange();
        newRange.selectNodeContents(editorRef.current);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      const fieldHtml = createFieldSpan(field);
      const temp = document.createElement('div');
      temp.innerHTML = fieldHtml;
      const fieldNode = temp.firstChild;

      if (fieldNode) {
        range.deleteContents();
        range.insertNode(fieldNode);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        updateValue(true);
      }
    },
    [updateValue]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('delete-field')) {
        e.preventDefault();
        e.stopPropagation();
        const fieldId = target.getAttribute('data-field-id');
        if (fieldId) {
          handleFieldDelete(e as unknown as MouseEvent, fieldId);
        }
      }
    },
    [handleFieldDelete]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);

        if (range && editorRef.current) {
          // 如果按下 Shift，插入软换行
          if (e.shiftKey) {
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);

            // 在某些浏览器中需要额外的 br 来创建新行
            const extraBr = document.createElement('br');
            range.insertNode(extraBr);

            // 移动光标到新行
            range.setStartAfter(br);
            range.setEndAfter(br);
          } else {
            // 普通回车键，插入段落换行
            const p = document.createElement('div');
            range.deleteContents();
            range.insertNode(p);

            // 移动光标到新段落
            range.setStart(p, 0);
            range.setEnd(p, 0);
          }

          // 更新选区
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);

          // 触发内容更新
          requestAnimationFrame(() => {
            if (editorRef.current) {
              onChange(htmlToContent(editorRef.current));
            }
          });
        }
      }
    },
    [onChange]
  );

  useEffect(() => {
    const timeoutRef = updateTimeoutRef.current;
    return () => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        {label && (
          <Label htmlFor={`field-editor-${label}`} className="font-normal">
            {label}
          </Label>
        )}
        {enableFieldSelector && (
          <FieldSelector currentFieldId={currentFieldId} onSelect={insertField} />
        )}
      </div>
      <div
        ref={editorRef}
        id={`field-editor-${label}`}
        className="relative min-h-[36px] w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        contentEditable
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        aria-label={label || '文本编辑器'}
        aria-describedby={`field-editor-desc-${label}`}
        data-placeholder={placeholder}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onInput={handleInput}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
      {placeholder && (
        <div id={`field-editor-desc-${label}`} className="sr-only">
          {placeholder}
        </div>
      )}
    </div>
  );
};
