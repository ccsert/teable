import type { LinkField } from '@teable/sdk';
import type { UseFormReturn } from 'react-hook-form';
import type { ITableRelation } from '../../../types';
import type { FormValues } from '../schema';

export interface ITableRelationConfigProps {
  baseId: string;
  table: ITableRelation;
  originalTableId: string;
  enabled?: boolean;
  onToggle?: () => void;
  onUpdate: (updated: ITableRelation) => void;
  onRemove: () => void;
  availableFields: LinkField[];
  direction: 'input' | 'output';
  form: UseFormReturn<FormValues>;
}
