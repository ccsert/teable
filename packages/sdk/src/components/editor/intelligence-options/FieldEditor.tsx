import { Button, Dialog, DialogContent, DialogTrigger, Label } from '@teable/ui-lib';
import { PlusIcon, XIcon } from 'lucide-react';
import type { ForwardRefRenderFunction } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { useFields, useFieldStaticGetter } from '../../../hooks';

interface IFieldEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  enableFieldSelector?: boolean;
  label?: string;
  currentFieldId?: string;
}

export interface IFieldEditorRef {
  focus: () => void;
}

interface IToken {
  type: 'field' | 'text';
  content: string;
  fieldId?: string;
  fieldName?: string;
}

const FieldEditorBase: ForwardRefRenderFunction<IFieldEditorRef, IFieldEditorProps> = (
  { value, onChange, placeholder, enableFieldSelector = true, label, currentFieldId },
  ref
) => {
  const [tokens, setTokens] = useState<IToken[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fields = useFields({ withHidden: true, withDenied: true });
  const getFieldStatic = useFieldStaticGetter();

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  // 解析value字符串为tokens
  useEffect(() => {
    const parseValue = (val: string) => {
      const fieldRegex = /\{([^}]+)\}/g;
      const tokens: IToken[] = [];
      let lastIndex = 0;
      let match;

      while ((match = fieldRegex.exec(val)) !== null) {
        if (match.index > lastIndex) {
          tokens.push({
            type: 'text',
            content: val.slice(lastIndex, match.index),
          });
        }

        const fieldId = match[1];
        const field = fields.find((f) => f.id === fieldId);
        if (field) {
          tokens.push({
            type: 'field',
            content: `{${fieldId}}`,
            fieldId: fieldId,
            fieldName: field.name,
          });
        }
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < val.length) {
        tokens.push({
          type: 'text',
          content: val.slice(lastIndex),
        });
      }

      setTokens(tokens);
    };

    parseValue(value);
  }, [value, fields]);

  // 修改 updateValue 函数，移除实时更新
  const updateValue = (newTokens: IToken[]) => {
    const newValue = newTokens.map((token) => token.content).join('');
    onChange(newValue);
  };

  // 修改输入框变化处理函数，不再实时更新值
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
  };

  // 修改按键处理函数
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      const newTokens = [...tokens, { type: 'text', content: currentInput }];
      setTokens(newTokens);
      updateValue(newTokens);
      setCurrentInput('');
    } else if (e.key === 'Backspace' && !currentInput && tokens.length > 0) {
      const newTokens = tokens.slice(0, -1);
      setTokens(newTokens);
      updateValue(newTokens);
    }
  };

  // 新增：处理输入框失去焦点
  const handleInputBlur = () => {
    if (currentInput.trim()) {
      const newTokens = [...tokens, { type: 'text', content: currentInput }];
      setTokens(newTokens);
      updateValue(newTokens);
      setCurrentInput('');
    }
  };

  // 修改字段选择处理函数
  const handleFieldSelect = (field: { id: string; name: string }) => {
    const newTokens = [...tokens];
    if (currentInput.trim()) {
      newTokens.push({ type: 'text', content: currentInput });
    }
    newTokens.push({
      type: 'field',
      content: `{${field.id}}`,
      fieldId: field.id,
      fieldName: field.name,
    });
    setTokens(newTokens);
    updateValue(newTokens);
    setCurrentInput('');
  };

  // 新增：合并相邻的文本 token
  const mergeTextTokens = (tokens: IToken[]) => {
    return tokens.reduce((acc: IToken[], curr) => {
      if (curr.type === 'text' && acc.length > 0 && acc[acc.length - 1].type === 'text') {
        acc[acc.length - 1].content += curr.content;
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);
  };

  // 新增：处理文本 token 的编辑
  const handleTextTokenChange = (index: number, newContent: string) => {
    const newTokens = [...tokens];
    if (newContent === '') {
      newTokens.splice(index, 1);
    } else {
      newTokens[index].content = newContent;
    }
    const mergedTokens = mergeTextTokens(newTokens);
    setTokens(mergedTokens);
    updateValue(mergedTokens);
  };

  const removeToken = (index: number) => {
    const newTokens = tokens.filter((_, i) => i !== index);
    setTokens(newTokens);
    updateValue(newTokens);
  };

  // 过滤掉当前字段，避免自循环依赖
  const availableFields = useMemo(() => {
    return fields.filter((field) => field.id !== currentFieldId);
  }, [fields, currentFieldId]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        {label && <Label className="font-normal">{label}</Label>}
        {enableFieldSelector && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <PlusIcon className="size-4" />
                添加字段
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <div className="grid grid-cols-2 gap-2 p-4">
                {availableFields.map((field) => {
                  const { Icon } = getFieldStatic(field.type, false);
                  return (
                    <button
                      key={field.id}
                      className="flex items-center gap-2 rounded-lg border p-3 text-left hover:bg-slate-50"
                      onClick={() => handleFieldSelect(field)}
                    >
                      <Icon className="size-5" />
                      <span className="text-sm">{field.name}</span>
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="flex min-h-[36px] flex-wrap items-center gap-1 rounded-lg border px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
        {tokens.map((token, index) =>
          token.type === 'field' ? (
            <div
              key={index}
              className="inline-flex h-6 items-center gap-1 rounded bg-blue-50 px-1.5 text-xs font-medium text-blue-700"
            >
              <span className="max-w-[120px] truncate">{token.fieldName}</span>
              <button
                onClick={() => removeToken(index)}
                className="ml-0.5 rounded-sm hover:bg-blue-100"
                title="删除字段"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ) : (
            <div
              key={index}
              className="text-sm"
              role="textbox"
              tabIndex={0}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleTextTokenChange(index, e.currentTarget.textContent || '')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            >
              {token.content}
            </div>
          )
        )}
        <input
          ref={inputRef}
          className="min-w-[60px] flex-1 bg-transparent py-0.5 text-sm outline-none"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder={tokens.length === 0 ? placeholder : undefined}
        />
      </div>
    </div>
  );
};

export const FieldEditor = forwardRef<IFieldEditorRef, IFieldEditorProps>(FieldEditorBase);
