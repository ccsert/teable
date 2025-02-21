import type { LinkField } from '@teable/sdk';
import type { UseFormReturn } from 'react-hook-form';
import type { IFieldInfo, ITableRelation } from '../../../types';
import type { FormValues } from '../schema';

export interface IOutputRelationsProps {
  baseId: string;
  tableId: string;
  outputTableFields: { tableId: string; fields: LinkField[] }[];
  form: UseFormReturn<FormValues>;
  relations: ITableRelation[];
  onUpdateRelations: (relations: ITableRelation[]) => void;
  sharedDisplayFields: Record<string, IFieldInfo[]>;
  updateSharedDisplayFields: (tableId: string, fields: IFieldInfo[]) => void;
  clearSharedDisplayFields: (tableId: string) => void;
}
