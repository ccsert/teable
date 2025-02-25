import type { IFieldInfo, ITableRelation } from '../../../types';

export interface ITableConfigDialogProps {
  table: ITableRelation;
  originalTableId: string;
  onUpdate: (updated: ITableRelation) => void;
  isAuto?: boolean;
  thisTableFields?: IFieldInfo[];
}
