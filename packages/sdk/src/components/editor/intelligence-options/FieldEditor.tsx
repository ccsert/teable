import { Label } from '@teable/ui-lib';
import { useCallback } from 'react';
import { useFields } from '../../../hooks';
import { CodeMirrorEditor } from './components/CodeMirrorEditor';
import { FieldSelector } from './components/FieldSelector';

interface IFieldEditorProps {
  value: string;
  onUpdate: (value: string, usedFieldIds: string[]) => void;
  placeholder?: string;
  enableFieldSelector?: boolean;
  label?: string;
  currentFieldId?: string;
}

export const FieldEditor = ({
  value,
  onUpdate,
  placeholder,
  enableFieldSelector = true,
  label,
  currentFieldId,
}: IFieldEditorProps) => {
  const fields = useFields({ withHidden: true, withDenied: true });

  const handleChange = useCallback(
    (newValue: string) => {
      const usedFieldIds = Array.from(newValue.matchAll(/\{([^}]+)\}/g))
        .map((match) => match[1])
        .filter((id, index, self) => self.indexOf(id) === index);
      onUpdate(newValue, usedFieldIds);
    },
    [onUpdate]
  );

  const insertField = useCallback(
    (field: { id: string; name: string }) => {
      const fieldMark = `{${field.id}}`;
      const newValue = value + fieldMark;
      handleChange(newValue);
    },
    [value, handleChange]
  );

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
      <CodeMirrorEditor
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="min-h-[120px]"
        fields={fields}
        enableFieldSelector={enableFieldSelector}
        currentFieldId={currentFieldId}
      />
    </div>
  );
};
