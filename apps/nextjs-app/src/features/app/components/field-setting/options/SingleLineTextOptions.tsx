import type {
  IIntelligenceOptions,
  ISingleLineTextFieldOptions,
  ISingleLineTextShowAs,
} from '@teable/core';
import { Input } from '@teable/ui-lib/shadcn';
import { DefaultValue } from '../DefaultValue';
import SingleLineIntelligenceOptions from '../intelligence-options/SingleLineIntelligenceOptions';
import { SingleTextLineShowAs } from '../show-as/SingleLineTextShowAs';

export const SingleLineTextOptions = (props: {
  fieldId?: string;
  options: Partial<ISingleLineTextFieldOptions> | undefined;
  onChange?: (options: Partial<ISingleLineTextFieldOptions>) => void;
  isLookup?: boolean;
}) => {
  const { fieldId, isLookup, options, onChange } = props;

  const onShowAsChange = (showAs?: ISingleLineTextShowAs) => {
    onChange?.({
      showAs,
    });
  };

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
      <SingleLineIntelligenceOptions
        fieldId={fieldId}
        options={options?.intelligence}
        onChange={onIntelligenceChange}
      />
      {!isLookup && (
        <DefaultValue onReset={() => onDefaultValueChange(undefined)}>
          <Input
            type="text"
            value={options?.defaultValue || ''}
            onChange={(e) => onDefaultValueChange(e.target.value)}
          />
        </DefaultValue>
      )}
      <SingleTextLineShowAs showAs={options?.showAs as never} onChange={onShowAsChange} />
    </div>
  );
};
