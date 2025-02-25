import { Label } from '@teable/ui-lib/dist/shadcn';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TableRelationConfig } from '../TableRelationConfig';
import type { IOutputRelationsProps } from './types';

export const OutputRelations: React.FC<IOutputRelationsProps> = ({
  baseId,
  tableId,
  outputTableFields,
  form,
  relations,
  onUpdateRelations,
  sharedDisplayFields,
  updateSharedDisplayFields,
  clearSharedDisplayFields,
  thisTableFields,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label>{t('outputRelations')}</Label>
      <div className="mb-2 text-sm text-muted-foreground">{t('outputRelationsHint')}</div>
      {outputTableFields.map(({ tableId: outputTableId, fields }) => {
        const existingRelation = relations.find((r) => r.isAuto && r.tableId === outputTableId);
        const isEnabled = !!existingRelation;

        return (
          <TableRelationConfig
            key={outputTableId}
            baseId={baseId}
            isAuto={true}
            thisTableFields={thisTableFields}
            table={{
              tableId: outputTableId,
              fieldId: existingRelation?.fieldId || fields[0].id,
              fieldName: existingRelation?.fieldName || fields[0].name,
              isAuto: true,
              displayFields: sharedDisplayFields[outputTableId] || existingRelation?.displayFields,
            }}
            originalTableId={tableId}
            enabled={isEnabled}
            onToggle={() => {
              if (isEnabled) {
                onUpdateRelations(
                  relations.filter((r) => !(r.isAuto && r.tableId === outputTableId))
                );

                // 检查是否还有输入关系使用这个表
                const hasInputRelation = relations.some(
                  (r) => !r.isAuto && r.tableId === outputTableId
                );
                if (!hasInputRelation) {
                  clearSharedDisplayFields(outputTableId);
                }
              } else {
                onUpdateRelations([
                  ...relations,
                  {
                    tableId: outputTableId,
                    fieldId: fields[0].id,
                    fieldName: fields[0].name,
                    isAuto: true,
                    displayFields: sharedDisplayFields[outputTableId],
                  },
                ]);
              }
            }}
            onUpdate={(updated) => {
              if (updated.displayFields) {
                updateSharedDisplayFields(updated.tableId, updated.displayFields);
              }

              const newRelations = relations.map((r) => {
                if (r.tableId === updated.tableId) {
                  return {
                    ...r,
                    fieldId: r.isAuto ? updated.fieldId : r.fieldId,
                    fieldName: r.isAuto ? updated.fieldName : r.fieldName,
                    targetTableId: r.isAuto ? updated.targetTableId : r.targetTableId,
                    displayFields: updated.displayFields,
                  };
                }
                return r;
              });
              onUpdateRelations(newRelations);
            }}
            onRemove={() => {
              onUpdateRelations(relations.filter((r) => r.tableId !== outputTableId));
              const hasOutputRelation = relations.some(
                (r) => r.isAuto && r.tableId === outputTableId
              );
              if (!hasOutputRelation) {
                clearSharedDisplayFields(outputTableId);
              }
            }}
            direction="output"
            form={form}
            availableFields={fields}
          />
        );
      })}
    </div>
  );
};
