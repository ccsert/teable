import { Loader2 } from '@teable/icons';
import { MagicAI } from '@teable/sdk/components/comment/comment-editor/plate-ui/icons';
import { Button } from '@teable/ui-lib/index';
import { useRef } from 'react';

const AIButton = ({
  x,
  y,
  onClick,
  loading = false,
  streamContent = '',
  onAccept,
  onCancel,
  columnIndex,
  rowIndex,
  currentColumnIndex,
  currentRowIndex,
}: {
  x: number;
  y: number;
  onClick: () => void;
  loading?: boolean;
  streamContent?: string;
  onAccept?: () => void;
  onCancel?: () => void;
  columnIndex: number;
  rowIndex: number;
  currentColumnIndex: number;
  currentRowIndex: number;
  containerRef: React.RefObject<HTMLDivElement>;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isCurrentCell = columnIndex === currentColumnIndex && rowIndex === currentRowIndex;

  if (!isCurrentCell) return null;

  return (
    <div
      className="fixed z-[9999] flex cursor-pointer items-center justify-center"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* 流式内容气泡 */}
      {(loading || streamContent) && (
        <div className="absolute bottom-full mb-2 w-[280px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div
            ref={contentRef}
            className="max-h-[120px] overflow-y-auto scroll-smooth text-sm text-gray-600 dark:text-gray-300"
          >
            <div className="whitespace-pre-wrap break-words">
              {streamContent || (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" />
                  <span>AI 正在生成内容...</span>
                </div>
              )}
            </div>
          </div>
          {streamContent && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel?.();
                }}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept?.();
                }}
              >
                接受
              </Button>
            </div>
          )}
        </div>
      )}

      {/* AI 按钮 */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        variant="ghost"
        size="sm"
        className="size-6 rounded-full border border-gray-200 bg-white/50 p-1 shadow-sm backdrop-blur-sm hover:bg-white/80 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800/80"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        ) : (
          <MagicAI active={true} />
        )}
      </Button>

      {/* Tooltip */}
      {!loading && !streamContent && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full opacity-0 transition-opacity group-hover:opacity-100">
          <div className="mb-1 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white dark:bg-gray-700">
            重新生成
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIButton;
