import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ITableRelation } from '../../../../types';
import type { FormValues } from '../../schema';

export const useSharedRelation = (table: ITableRelation, form: UseFormReturn<FormValues>) => {
  return useMemo(() => {
    const relations = form.getValues('relations');
    return relations.find(
      (r: ITableRelation) => r.tableId === table.tableId && r.isAuto !== table.isAuto
    );
  }, [table.tableId, table.isAuto, form]);
};
