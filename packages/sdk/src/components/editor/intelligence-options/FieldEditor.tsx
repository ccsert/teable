import { Label } from '@teable/ui-lib';
import { debounce } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { useFields } from '../../../hooks';
import { FieldSelector } from './components/FieldSelector';

interface IFieldEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  enableFieldSelector?: boolean;
  label?: string;
  currentFieldId?: string;
}

interface IFieldNode {
  id: string;
  name: string;
}

export const FieldEditor = ({
  value,
  onChange,
  placeholder,
  enableFieldSelector = true,
  label,
  currentFieldId,
}: IFieldEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fields = useFields({ withHidden: true, withDenied: true });
  const [isComposing, setIsComposing] = useState(false);

  // 创建字段标记的 HTML
  const createFieldSpan = (field: IFieldNode) => {
    return `<span 
      class="inline-flex h-6 items-center gap-1 rounded bg-blue-50 px-1.5 text-xs font-medium text-blue-700 cursor-default mx-0.5 select-none" 
      contenteditable="false" 
      data-field-id="${field.id}"
      data-field-name="${field.name}"
    >
      ${field.name}
      <button 
        type="button"
        class="ml-0.5 rounded-sm hover:bg-blue-100 p-0.5 delete-field" 
        data-field-id="${field.id}"
      >
        <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </span>`;
  };

  // 将内容转换为 HTML
  const contentToHtml = (content: string): string => {
    const fieldRegex = /\{([^}]+)\}/g;
    let lastIndex = 0;
    let result = '';
    let match;

    while ((match = fieldRegex.exec(content)) !== null) {
      // 添加字段前的普通文本
      result += content.slice(lastIndex, match.index);

      // 添加字段标记
      const fieldId = match[1];
      const field = fields.find((f) => f.id === fieldId);
      if (field) {
        result += createFieldSpan(field);
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余的文本
    result += content.slice(lastIndex);
    return result;
  };

  // 将 HTML 转换回内容字符串
  const htmlToContent = (element: HTMLElement): string => {
    let content = '';
    const nodes = Array.from(element.childNodes);

    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        content += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.hasAttribute('data-field-id')) {
          content += `{${el.getAttribute('data-field-id')}}`;
        } else if (el.tagName.toLowerCase() === 'br') {
          content += '\n';
        } else {
          content += el.textContent || '';
        }
      }
    });

    return content;
  };

  // 恢复光标位置
  const restoreCursorPosition = (
    editor: HTMLElement,
    startContainer: Node | undefined | null,
    startOffset: number,
    selection: Selection
  ) => {
    if (!startContainer) return;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent === startContainer.textContent) {
        const newRange = document.createRange();
        newRange.setStart(node, startOffset);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        break;
      }
      node = walker.nextNode();
    }
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
          restoreCursorPosition(editorRef.current, startContainer, startOffset, selection);
        } catch (e) {
          console.debug('Failed to restore cursor position:', e);
        }
      }
    }
  }, [value, fields]);

  // 更新值
  const updateValue = () => {
    if (!editorRef.current || isComposing) return;
    const newContent = htmlToContent(editorRef.current);
    if (newContent !== value) {
      onChange(newContent);
    }
  };

  // 使用防抖处理输入更新
  const debouncedUpdate = useRef(
    debounce(() => {
      updateValue();
    }, 100)
  ).current;

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  // 插入字段
  const insertField = (field: IFieldNode) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      // 如果没有选中编辑器内的内容，将字段插入到末尾
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
    }

    // 更新内容
    const newContent = htmlToContent(editorRef.current);
    onChange(newContent);
  };

  // 删除字段
  const deleteField = (fieldId: string) => {
    if (!editorRef.current) return;

    const fieldElement = editorRef.current.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldElement) {
      fieldElement.remove();
      const newContent = htmlToContent(editorRef.current);
      onChange(newContent);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        {label && <Label className="font-normal">{label}</Label>}
        {enableFieldSelector && (
          <FieldSelector currentFieldId={currentFieldId} onSelect={insertField} />
        )}
      </div>
      <div
        ref={editorRef}
        className="min-h-[36px] w-full rounded-lg border px-3 py-2 text-sm empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus:outline-none focus:ring-2 focus:ring-primary/20"
        contentEditable
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        aria-label={label || 'Text editor'}
        data-placeholder={placeholder}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => {
          setIsComposing(false);
          if (editorRef.current) {
            onChange(htmlToContent(editorRef.current));
          }
        }}
        onInput={() => {
          if (!isComposing) {
            debouncedUpdate();
          }
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('delete-field')) {
            e.preventDefault();
            e.stopPropagation();
            const fieldId = target.getAttribute('data-field-id');
            if (fieldId) {
              deleteField(fieldId);
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
            if (editorRef.current) {
              onChange(htmlToContent(editorRef.current));
            }
          }
        }}
      />
    </div>
  );
};
