import type { IIntelligenceOptions } from '@teable/core';
import { FieldType } from '@teable/core';
import { FieldEditor } from '@teable/sdk/components/editor/intelligence-options';

const SingleLineIntelligenceOptions: React.FC<{
  options: Partial<IIntelligenceOptions> | undefined;
  onChange?: (options: Partial<IIntelligenceOptions>) => void;
  fieldId?: string;
}> = (props) => {
  const { options, onChange, fieldId } = props;

  return (
    <FieldEditor
      label="提示词"
      value={options?.prompt || ''}
      onChange={(value) => {
        onChange?.({ ...options, prompt: value, type: FieldType.SingleLineText });
      }}
      currentFieldId={fieldId}
      placeholder="输入提示词..."
    />
  );
};

export default SingleLineIntelligenceOptions;
