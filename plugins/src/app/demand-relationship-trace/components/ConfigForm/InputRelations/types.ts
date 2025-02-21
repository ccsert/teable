import type { Table } from '@teable/sdk';
import type { UseFormReturn } from 'react-hook-form';
import type { IFieldInfo, ITableRelation } from '../../../types';
import type { FormValues } from '../schema';

export interface IInputRelationsProps {
  baseId: string;
  tableId: string;
  form: UseFormReturn<FormValues>;
  relations: ITableRelation[];
  onUpdateRelations: (relations: ITableRelation[]) => void;
  sharedDisplayFields: Record<string, IFieldInfo[]>;
  updateSharedDisplayFields: (tableId: string, fields: IFieldInfo[]) => void;
  clearSharedDisplayFields: (tableId: string) => void;
  availableInputTables: Table[];
}

export interface ITableSelectorProps {
  availableInputTables: Table[];
  relations: ITableRelation[];
  onUpdateRelations: (relations: ITableRelation[]) => void;
}
