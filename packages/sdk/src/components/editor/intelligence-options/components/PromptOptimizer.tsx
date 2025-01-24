import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@teable/ui-lib';
import { useState } from 'react';
import { MagicAI } from '../../../comment/comment-editor/plate-ui/icons';
import { CodeMirrorEditor } from './CodeMirrorEditor';

interface IPromptOptimizerProps {
  value: string;
  onChange: (value: string) => void;
  fields?: { id: string; name: string }[];
  currentFieldId?: string;
}

// 创建一个纯编辑器组件，移除所有扩展按钮
const PureEditor = (props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <CodeMirrorEditor
    {...props}
    className="h-[360px] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm"
    isFullscreen={true}
    enableFieldSelector={false}
    disablePromptOptimizer={true}
    hideHeader={true}
  />
);

// 创建一个带字段选择器的编辑器组件
const EditorWithFields = (props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fields?: { id: string; name: string }[];
  currentFieldId?: string;
}) => (
  <div className="relative">
    <CodeMirrorEditor
      {...props}
      className="h-[360px] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm"
      isFullscreen={true}
      enableFieldSelector={false}
      disablePromptOptimizer={true}
      hideHeader={true}
    />
  </div>
);

export const PromptOptimizer = ({
  value,
  onChange,
  fields,
  currentFieldId,
}: IPromptOptimizerProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (!description.trim()) return;

    setIsOptimizing(true);
    try {
      // TODO: 调用 AI 接口优化提示词
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟 API 调用
      setOptimizedPrompt('优化后的提示词示例');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApply = () => {
    if (optimizedPrompt.trim()) {
      onChange(optimizedPrompt);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 rounded-md border border-gray-100 bg-white/80 p-1.5 text-gray-600 shadow-sm backdrop-blur-sm hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
        onClick={() => setOpen(true)}
      >
        <MagicAI className="size-full" active={true} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[1200px] gap-0 p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>提示词优化</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">描述你想要的提示词效果</div>
                <Button
                  size="sm"
                  onClick={handleOptimize}
                  disabled={isOptimizing || !description.trim()}
                  className="w-32"
                >
                  {isOptimizing ? '优化中...' : '生成优化提示词'}
                </Button>
              </div>
              <PureEditor
                value={description}
                onChange={setDescription}
                placeholder="请描述你想要的提示词效果，例如：
1. 我想要一个能够生成产品描述的提示词
2. 这个提示词需要考虑产品的特点和优势
3. 生成的内容要简洁有力，突出重点..."
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">优化后的提示词</div>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleApply}
                  disabled={!optimizedPrompt.trim()}
                  className="w-32"
                >
                  应用优化结果
                </Button>
              </div>
              <EditorWithFields
                value={optimizedPrompt}
                onChange={setOptimizedPrompt}
                placeholder="优化后的提示词将显示在这里..."
                fields={fields}
                currentFieldId={currentFieldId}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
