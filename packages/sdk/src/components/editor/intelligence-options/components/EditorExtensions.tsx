import { Button } from '@teable/ui-lib';
import { Maximize2, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FieldSelector } from './FieldSelector';
import { PromptOptimizer } from './PromptOptimizer';

export interface IEditorExtension {
  id: string;
  component: React.ReactNode;
  order?: number;
}

interface IEditorExtensionsProps {
  value: string;
  onChange: (value: string) => void;
  fields?: { id: string; name: string }[];
  currentFieldId?: string;
  enableFieldSelector?: boolean;
  disablePromptOptimizer?: boolean;
  isFullscreen?: boolean;
  onFullscreen?: () => void;
  onFieldSelect?: (field: { id: string; name: string }) => void;
}

// 字段选择器扩展
const FieldSelectorExtension = ({
  currentFieldId,
  onSelect,
}: {
  currentFieldId?: string;
  onSelect?: (field: { id: string; name: string }) => void;
}) => <FieldSelector currentFieldId={currentFieldId} onSelect={onSelect} />;

// 提示词优化器扩展
const PromptOptimizerExtension = ({
  value,
  onChange,
  fields,
  currentFieldId,
}: {
  value: string;
  onChange: (value: string) => void;
  fields?: { id: string; name: string }[];
  currentFieldId?: string;
}) => (
  <PromptOptimizer
    value={value}
    onChange={onChange}
    fields={fields}
    currentFieldId={currentFieldId}
  />
);

// 全屏扩展
const FullscreenExtension = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    className="size-7 rounded-md border border-gray-100 bg-white/80 p-1.5 text-gray-600 shadow-sm backdrop-blur-sm hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
    onClick={onClick}
  >
    <Maximize2 className="size-full" />
  </Button>
);

// 更多选项按钮样式
const MoreButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    className="size-7 rounded-md border border-gray-100 bg-white/80 p-1.5 text-gray-600 shadow-sm backdrop-blur-sm hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
    onClick={onClick}
  >
    <MoreHorizontal className="size-full" />
  </Button>
);

export const EditorExtensions = ({
  value,
  onChange,
  fields,
  currentFieldId,
  enableFieldSelector,
  disablePromptOptimizer,
  isFullscreen,
  onFullscreen,
  onFieldSelect,
}: IEditorExtensionsProps) => {
  const [showMore, setShowMore] = useState(false);

  const extensions = useMemo(() => {
    const items: IEditorExtension[] = [];

    if (enableFieldSelector) {
      items.push({
        id: 'field-selector',
        component: (
          <FieldSelectorExtension currentFieldId={currentFieldId} onSelect={onFieldSelect} />
        ),
        order: 1,
      });
    }

    if (!disablePromptOptimizer) {
      items.push({
        id: 'prompt-optimizer',
        component: (
          <PromptOptimizerExtension
            value={value}
            onChange={onChange}
            fields={fields}
            currentFieldId={currentFieldId}
          />
        ),
        order: 2,
      });
    }

    if (!isFullscreen && onFullscreen) {
      items.push({
        id: 'fullscreen',
        component: <FullscreenExtension onClick={onFullscreen} />,
        order: 3,
      });
    }

    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [
    value,
    onChange,
    fields,
    currentFieldId,
    enableFieldSelector,
    disablePromptOptimizer,
    isFullscreen,
    onFullscreen,
    onFieldSelect,
  ]);

  const visibleExtensions = extensions.slice(0, 3);
  const hiddenExtensions = extensions.slice(3);

  return (
    <div className="flex items-center gap-2">
      {visibleExtensions.map((extension) => (
        <div key={extension.id}>{extension.component}</div>
      ))}
      {hiddenExtensions.length > 0 && (
        <div className="relative">
          <MoreButton onClick={() => setShowMore(!showMore)} />
          {showMore && (
            <div className="absolute right-0 top-full z-50 mt-1 w-max rounded-lg border bg-white p-1 shadow-lg">
              {hiddenExtensions.map((extension) => (
                <div key={extension.id} className="px-1 py-0.5">
                  {extension.component}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
