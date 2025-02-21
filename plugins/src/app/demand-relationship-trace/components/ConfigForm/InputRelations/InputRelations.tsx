import { Label } from '@teable/ui-lib/dist/shadcn';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ITableRelation } from '../../../types';
import { TableRelationConfig } from '../TableRelationConfig';
import { TableSelector } from './components/TableSelector';
import type { IInputRelationsProps } from './types';

export const InputRelations = React.memo<IInputRelationsProps>(
  ({
    baseId,
    tableId,
    form,
    relations,
    onUpdateRelations,
    sharedDisplayFields,
    updateSharedDisplayFields,
    clearSharedDisplayFields,
    availableInputTables,
  }) => {
    const { t } = useTranslation();

    return (
      <div className="space-y-2">
        <Label>{t('inputRelations')}</Label>
        <div className="mb-2 text-sm text-muted-foreground">{t('inputRelationsHint')}</div>
        {relations
          .filter((relation: ITableRelation) => !relation.isAuto)
          .map((relation: ITableRelation) => (
            <TableRelationConfig
              key={relation.tableId}
              baseId={baseId}
              table={{
                ...relation,
                displayFields: sharedDisplayFields[relation.tableId] || relation.displayFields,
              }}
              originalTableId={tableId}
              onUpdate={(updated) => {
                // 更新共享展示字段
                if (updated.displayFields) {
                  updateSharedDisplayFields(updated.tableId, updated.displayFields);
                }

                const newRelations = relations.map((r: ITableRelation) => {
                  if (r.tableId === updated.tableId) {
                    return {
                      ...r,
                      fieldId: !r.isAuto ? updated.fieldId : r.fieldId,
                      fieldName: !r.isAuto ? updated.fieldName : r.fieldName,
                      targetTableId: !r.isAuto ? updated.targetTableId : r.targetTableId,
                      displayFields: updated.displayFields,
                    };
                  }
                  return r;
                });
                onUpdateRelations(newRelations);
              }}
              onRemove={() => {
                onUpdateRelations(
                  relations.filter(
                    (r: ITableRelation) => r.isAuto || r.tableId !== relation.tableId
                  )
                );

                // 检查是否还有输出关系使用这个表
                const hasOutputRelation = relations.some(
                  (r: ITableRelation) => r.isAuto && r.tableId === relation.tableId
                );
                if (!hasOutputRelation) {
                  clearSharedDisplayFields(relation.tableId);
                }
              }}
              direction="input"
              form={form}
              availableFields={[]}
            />
          ))}

        {/* 添加输入关系表选择 */}
        <TableSelector
          availableInputTables={availableInputTables}
          relations={relations}
          onUpdateRelations={onUpdateRelations}
        />
      </div>
    );
  }
);

InputRelations.displayName = 'InputRelations';
