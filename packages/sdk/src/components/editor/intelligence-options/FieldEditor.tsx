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

  return (
    <div className="w-full">
      <CodeMirrorEditor
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="min-h-[120px]"
        fields={fields}
        enableFieldSelector={enableFieldSelector}
        currentFieldId={currentFieldId}
        label={label}
      />
    </div>
  );
};
