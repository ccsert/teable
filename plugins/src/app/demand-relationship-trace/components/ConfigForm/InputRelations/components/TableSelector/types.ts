import type { Table } from '@teable/sdk';
import type { ITableRelation } from '../../../../../types';

export interface ITableSelectorProps {
  availableInputTables: Table[];
  relations: ITableRelation[];
  onUpdateRelations: (relations: ITableRelation[]) => void;
}
