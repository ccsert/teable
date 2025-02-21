import type { ITableRelation } from '../../../types';

export interface ITableConfigDialogProps {
  table: ITableRelation;
  originalTableId: string;
  onUpdate: (updated: ITableRelation) => void;
}
