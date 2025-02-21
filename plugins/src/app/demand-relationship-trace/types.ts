export interface IFieldInfo {
  id: string;
  name: string;
  type: string;
  isLookup?: boolean;
}

export interface ITableRelation {
  tableId: string;
  fieldId: string;
  fieldName?: string;
  targetTableId?: string;
  isAuto?: boolean;
  displayFields?: IFieldInfo[];
}

export interface IConfig {
  analysisMode: 'intelligent' | 'static';
  promptText?: string;
  relations: ITableRelation[];
  staticConfig?: {
    relations: ITableRelation[];
  };
  validate?: () => boolean;
  isGrouped?: boolean;
  isConfigured?: boolean;
}

export interface IConfigFormProps {
  config: {
    analysisMode: 'intelligent' | 'static';
    promptText?: string;
    relations: ITableRelation[];
  };
  onConfigChange: (config: {
    analysisMode: 'intelligent' | 'static';
    promptText?: string;
    relations: ITableRelation[];
  }) => void;
}
