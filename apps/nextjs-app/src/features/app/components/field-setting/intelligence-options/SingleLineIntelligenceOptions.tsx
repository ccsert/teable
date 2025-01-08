import type { IIntelligenceOptions } from '@teable/core';
import { FieldType, IntelligenceMethod, intelligenceMethodMeta } from '@teable/core';
import { FieldEditor } from '@teable/sdk/components/editor/intelligence-options';
import { Label, Selector, Switch } from '@teable/ui-lib';
import { useEffect, useState } from 'react';

const methodOptions = [
  { id: '', name: '无' },
  ...Object.entries(intelligenceMethodMeta)
    .filter(([key]) => key === IntelligenceMethod.TextGeneration)
    .map(([key, meta]) => ({
      id: key,
      name: meta.name,
    })),
];

const SingleLineIntelligenceOptions: React.FC<{
  options: Partial<IIntelligenceOptions> | undefined;
  onChange: (options: Partial<IIntelligenceOptions>) => void;
  fieldId?: string;
}> = (props) => {
  const { options, onChange, fieldId } = props;
  const [selectedMethod, setSelectedMethod] = useState<string>(options?.method || '');

  // 处理方法变更
  const handleMethodChange = (value: string) => {
    setSelectedMethod(value);
    if (!value) {
      // 当选择"无"时，清空所有相关数据
      onChange({
        enabled: false,
      });
      return;
    }

    // 选择方法时，保持现有的提示词等数据
    onChange({
      ...options,
      method: value as IntelligenceMethod,
      enabled: true,
      type: FieldType.SingleLineText,
    });
  };

  // 处理提示词变更
  const handlePromptChange = (value: string, fieldIds: string[]) => {
    onChange({
      ...options,
      prompt: value,
      dynamicDepends: fieldIds,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-normal">智能字段</Label>
        <Selector
          selectedId={selectedMethod}
          onChange={handleMethodChange}
          candidates={methodOptions}
          placeholder="选择智能生成方法"
          className="w-[200px]"
        />
      </div>

      {selectedMethod && (
        <>
          <FieldEditor
            label="提示词"
            value={options?.prompt || ''}
            currentFieldId={fieldId}
            placeholder="输入提示词..."
            onUpdate={handlePromptChange}
          />
          <div className="flex items-center justify-between">
            <Label className="font-normal">自动更新</Label>
            <Switch
              id="field-options-auto-fill"
              checked={Boolean(options?.dynamic)}
              onCheckedChange={(checked) =>
                onChange({
                  ...options,
                  dynamic: checked,
                })
              }
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SingleLineIntelligenceOptions;
