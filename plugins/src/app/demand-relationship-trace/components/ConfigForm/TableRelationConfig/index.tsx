import { useTables, TableProvider, StandaloneViewProvider } from '@teable/sdk';
import { Badge, Button, Checkbox } from '@teable/ui-lib/dist/shadcn';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TableConfigDialog } from '../TableConfigDialog';
import { useSharedRelation } from './hooks/useSharedRelation';
import type { ITableRelationConfigProps } from './types';

export const TableRelationConfig = ({
  baseId,
  table,
  originalTableId,
  enabled = true,
  onToggle,
  onUpdate,
  onRemove,
  direction,
  form,
  isAuto,
  thisTableFields,
}: ITableRelationConfigProps) => {
  const { t } = useTranslation();
  const tables = useTables();
  const tableName = tables?.find((t) => t.id === table.tableId)?.name || table.tableId;
  const sharedRelation = useSharedRelation(table, form);

  // 修改初始化逻辑，添加 enabled 状态的监听
  useEffect(() => {
    if (enabled && !table.displayFields && sharedRelation?.displayFields) {
      onUpdate({
        ...table,
        displayFields: sharedRelation.displayFields,
      });
    }
  }, [enabled, table, sharedRelation, onUpdate]);

  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={enabled} onCheckedChange={onToggle} />
          <div className="flex items-center gap-2">
            <span>{tableName}</span>
            <Badge variant="outline" className="text-xs">
              {direction === 'input' ? t('inputDirection') : t('outputDirection')}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TableProvider>
            <StandaloneViewProvider baseId={baseId} tableId={table.tableId}>
              <TableConfigDialog
                table={table}
                onUpdate={onUpdate}
                originalTableId={originalTableId}
                isAuto={isAuto}
                thisTableFields={thisTableFields}
              />
            </StandaloneViewProvider>
          </TableProvider>

          {!table.isAuto && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="size-8"
              aria-label={t('removeTable')}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{t('relation')}:</span>
          {table.fieldName}
        </Badge>
        {table.displayFields?.length ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{t('display')}:</span>
            {table.displayFields.map((f) => f.name).join(', ')}
          </Badge>
        ) : null}
      </div>
    </div>
  );
};
