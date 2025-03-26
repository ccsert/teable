import type { IIntelligenceOptions, ILongTextFieldOptions } from '@teable/core';
import { Textarea } from '@teable/ui-lib/shadcn';
import { DefaultValue } from '../DefaultValue';
import { LongTextIntelligenceOptions } from '../intelligence-options';

export const LongTextOptions = (props: {
  fieldId?: string;
  options: Partial<ILongTextFieldOptions> | undefined;
  onChange?: (options: Partial<ILongTextFieldOptions>) => void;
  isLookup?: boolean;
}) => {
  const { fieldId, isLookup, options, onChange } = props;

  const onDefaultValueChange = (defaultValue: string | undefined) => {
    onChange?.({
      defaultValue,
    });
  };

  const onIntelligenceChange = (intelligence: IIntelligenceOptions) => {
    onChange?.({
      intelligence,
    });
  };

  return (
    <div className="form-control space-y-2">
      <LongTextIntelligenceOptions
        fieldId={fieldId}
        options={options?.intelligence}
        onChange={onIntelligenceChange}
      />
      {!isLookup && (
        <DefaultValue onReset={() => onDefaultValueChange(undefined)}>
          <Textarea
            className="w-full"
            value={options?.defaultValue || ''}
            onChange={(e) => onDefaultValueChange(e.target.value)}
            rows={3}
          />
        </DefaultValue>
      )}
    </div>
  );
};
