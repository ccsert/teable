import { Injectable, Logger } from '@nestjs/common';
import { type IIntelligenceOptions } from '@teable/core';
import { PrismaService } from '@teable/db-main-prisma';
import { generateText } from 'ai';
import { Knex } from 'knex';
import { InjectModel } from 'nest-knexjs';
import { IThresholdConfig, ThresholdConfig } from '../../configs/threshold.config';
import { AiService } from '../ai/ai.service';
import { TASK_MODEL_MAP } from '../ai/constant';
import type { ICellContext } from '../calculation/utils/changes';
import { systemDbFieldNames } from '../field/constant';
import { FieldService } from '../field/field.service';
import { RecordOpenApiService } from '../record/open-api/record-open-api.service';
import type { ICreateRecordsPayload } from '../undo-redo/operations/create-records.operation';
import type { IUpdateRecordsPayload } from '../undo-redo/operations/update-records.operation';

// 添加类型定义
type IField = {
  id: string;
  name: string;
  dbFieldName: string;
  options: { intelligence?: IIntelligenceOptions };
};

type IIntelligenceField = {
  fieldId: string;
  options: { intelligence?: IIntelligenceOptions };
};

type IFieldChangesMap = Map<string, Map<string, { newValue: unknown; oldValue: unknown }>>;

type IProcessContext = {
  fieldMap: Record<string, string>;
  fields: IField[];
  sortedFields: IIntelligenceField[];
  fieldChanges: IFieldChangesMap;
};

type IFieldProcessContext = {
  fieldMap: Record<string, string>;
  fields: IField[];
};

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  private processingLocks = new Map<string, boolean>();
  private cancelTokens = new Map<string, AbortController>();
  private readonly maxRetries = 3;
  private readonly smallBatchSize = 2;
  private readonly batchDelay = 500;
  private readonly taskCancelledMessage = 'Task cancelled';
  private readonly thinkingMessage = '思考中...';
  private readonly thinkingFailedMessage = '思考失败';

  constructor(
    private readonly aiService: AiService,
    private readonly fieldService: FieldService,
    private readonly prismaService: PrismaService,
    @InjectModel('CUSTOM_KNEX') private readonly knex: Knex,
    @ThresholdConfig() private readonly thresholdConfig: IThresholdConfig,
    private readonly recordOpenApiService: RecordOpenApiService
  ) {}

  async triggerIntelligenceCreate(
    tableId: string,
    fieldId: string,
    intelligenceOptions: IIntelligenceOptions
  ) {
    const lockKey = `${tableId}:${fieldId}`;

    if (this.cancelTokens.has(lockKey)) {
      this.cancelTokens.get(lockKey)?.abort();
      this.cancelTokens.delete(lockKey);
      this.processingLocks.delete(lockKey);
    }

    const abortController = new AbortController();
    this.cancelTokens.set(lockKey, abortController);

    try {
      this.processingLocks.set(lockKey, true);

      if (!this.validateIntelligenceOptions(intelligenceOptions)) {
        return;
      }

      const { prompt, dynamicDepends } = intelligenceOptions;
      const fields = await this.fieldService.getFieldsByQuery(tableId);
      const fieldMap = this.createFieldMap(fields);
      const { baseId, dbTableName } = await this.getTableMetadata(tableId);
      const dependsFieldNames = this.getDependsFieldNames(fields, [...dynamicDepends!, fieldId]);
      // 获取fieldId的名称
      const fieldName = fields.find((field) => field.id === fieldId)?.name;
      await this.processRecordsInChunks(dbTableName, dependsFieldNames, async (records) => {
        if (abortController.signal.aborted) {
          throw new Error(this.taskCancelledMessage);
        }
        await this.processRecordBatch(tableId, records, {
          fieldMap,
          dynamicDepends: dynamicDepends!,
          prompt: prompt!,
          baseId,
          fieldId,
          fieldName: fieldName!,
          signal: abortController.signal,
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Task cancelled') {
        this.logger.log(`Processing cancelled for field ${fieldId}`);
        return;
      }
      throw error;
    } finally {
      this.processingLocks.delete(lockKey);
      this.cancelTokens.delete(lockKey);
    }
  }

  private validateIntelligenceOptions(options: IIntelligenceOptions): boolean {
    return (
      !!options.enabled &&
      Array.isArray(options.dynamicDepends) &&
      options.dynamicDepends.length > 0 &&
      !!options.prompt
    );
  }

  private createFieldMap(fields: { id: string; dbFieldName: string }[]): Record<string, string> {
    return fields.reduce(
      (acc, field) => {
        acc[field.id] = field.dbFieldName;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  private async getTableMetadata(tableId: string) {
    return await this.prismaService.tableMeta.findUniqueOrThrow({
      where: { id: tableId },
      select: {
        baseId: true,
        dbTableName: true,
      },
    });
  }

  private getDependsFieldNames(
    fields: { id: string; dbFieldName: string }[],
    dynamicDepends: string[]
  ): string[] {
    const dependsFields = fields.filter((field) => dynamicDepends.includes(field.id));
    return dependsFields.map((field) => field.dbFieldName);
  }

  private async processRecordsInChunks(
    dbTableName: string,
    dependsFieldNames: string[],
    processor: (records: Record<string, unknown>[]) => Promise<void>
  ) {
    const rowCount = await this.getRowCount(dbTableName);
    const chunkSize = this.thresholdConfig.calcChunkSize;
    const totalPages = Math.ceil(rowCount / chunkSize);

    for (let page = 0; page < totalPages; page++) {
      const records = await this.getRecordsByPage(dbTableName, dependsFieldNames, page, chunkSize);
      await processor(records);
    }
  }

  private async processRecordBatch(
    tableId: string,
    records: Record<string, unknown>[],
    config: {
      fieldMap: Record<string, string>;
      dynamicDepends: string[];
      prompt: string;
      baseId: string;
      fieldId: string;
      fieldName: string;
      signal: AbortSignal;
    }
  ) {
    const { fieldMap, dynamicDepends, prompt, fieldId, fieldName, signal } = config;

    for (const batch of this.createBatches(records, this.smallBatchSize)) {
      if (signal.aborted) {
        throw new Error('Task cancelled');
      }

      let retryCount = 0;
      while (retryCount < this.maxRetries) {
        try {
          // 1. 先更新为"思考中"状态
          await this.prismaService.$transaction(async () => {
            await Promise.all(
              batch.map((record) =>
                this.recordOpenApiService.updateRecord(tableId, record.__id as string, {
                  record: {
                    fields: {
                      [fieldName]: this.thinkingMessage,
                    },
                  },
                })
              )
            );
          });

          // 2. 处理记录（耗时操作）
          const results = await Promise.all(
            batch.map((record) =>
              this.processRecord(record, { fieldMap, dynamicDepends, prompt, fieldId })
            )
          );

          // 3. 更新最终结果
          await this.prismaService.$transaction(async () => {
            await Promise.all(
              results.map(({ recordId, success, result }) =>
                this.recordOpenApiService.updateRecord(tableId, recordId, {
                  record: {
                    fields: {
                      [fieldName]: success ? result : this.thinkingFailedMessage,
                    },
                  },
                })
              )
            );
          });

          break;
        } catch (error) {
          retryCount++;
          this.logger.warn(
            `Retry ${retryCount}/${this.maxRetries} for batch processing failed`,
            error
          );
          if (retryCount === this.maxRetries) {
            this.logger.error('Max retries reached, giving up', error);
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, this.batchDelay));
    }
  }

  private createBatches<T>(array: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }

  private async processRecord(
    record: Record<string, unknown>,
    config: {
      fieldMap: Record<string, string>;
      dynamicDepends: string[];
      prompt: string;
      fieldId: string;
    }
  ): Promise<{ recordId: string; success: boolean; result?: string }> {
    try {
      const processedPrompt = this.replacePlaceholders(record, {
        fieldMap: config.fieldMap,
        dynamicDepends: config.dynamicDepends,
        prompt: config.prompt,
      });

      const aiConfig = await this.aiService.getAIConfig();
      const currentTaskModel = TASK_MODEL_MAP.coding;
      const modelKey = aiConfig[currentTaskModel as keyof typeof aiConfig] as string;
      const modelInstance = await this.aiService.getModelInstance(modelKey, aiConfig.llmProviders);

      const result = await generateText({
        model: modelInstance,
        prompt: processedPrompt,
      });

      return {
        recordId: record.__id as string,
        success: true,
        result: result.text,
      };
    } catch (error) {
      this.logger.error(`Error processing record for field ${config.fieldId}`, error);
      return {
        recordId: record.__id as string,
        success: false,
      };
    }
  }

  private replacePlaceholders(
    record: Record<string, unknown>,
    config: {
      fieldMap: Record<string, string>;
      dynamicDepends: string[];
      prompt: string;
    }
  ): string {
    const { fieldMap, dynamicDepends, prompt } = config;
    return dynamicDepends.reduce((processedPrompt, fieldId) => {
      const placeholder = `{${fieldId}}`;
      const dbFieldName = fieldMap[fieldId];
      const fieldValue = record[dbFieldName];
      return processedPrompt.replace(placeholder, String(fieldValue ?? ''));
    }, prompt);
  }
  async getRowCount(dbTableName: string) {
    const query = this.knex.count('*', { as: 'count' }).from(dbTableName).toQuery();
    const [{ count }] = await this.prismaService.$queryRawUnsafe<{ count: bigint }[]>(query);
    return Number(count);
  }
  private async getRecordsByPage(
    dbTableName: string,
    dbFieldNames: string[],
    page: number,
    chunkSize: number
  ) {
    const query = this.knex(dbTableName)
      .select([...dbFieldNames, ...systemDbFieldNames])
      .where((builder) => {
        dbFieldNames.forEach((fieldNames, index) => {
          if (index === 0) {
            builder.whereNotNull(fieldNames);
          } else {
            builder.orWhereNotNull(fieldNames);
          }
        });
      })
      .orderBy('__auto_number')
      .limit(chunkSize)
      .offset(page * chunkSize)
      .toQuery();
    return this.prismaService
      .txClient()
      .$queryRawUnsafe<{ [dbFieldName: string]: unknown }[]>(query);
  }

  async triggerIntelligenceUpdateRecords(payload: IUpdateRecordsPayload) {
    const { tableId, cellContexts } = payload;

    // 按字段分组整理变更数据，优化数据结构
    const fieldChanges = this.groupCellChangesByField(cellContexts);
    if (fieldChanges.size === 0) return;

    // 获取启用了智能功能的字段
    const intelligenceFields = await this.getIntelligenceFields(tableId);
    if (intelligenceFields.length === 0) return;

    // 找出受影响的智能字段并排序
    const affectedFields = this.getAffectedIntelligenceFields(intelligenceFields, fieldChanges);
    if (affectedFields.length === 0) return;
    const sortedFields = this.topologicalSort(affectedFields);

    // 获取处理所需的基础数据
    const fields = await this.fieldService.getFieldsByQuery(tableId);
    const fieldMap = this.createFieldMap(fields);
    const recordsToProcess = this.getRecordsToProcess(fieldChanges);

    // 处理每条记录
    await this.processRecords(tableId, recordsToProcess, {
      fieldMap,
      fields: fields as IField[],
      sortedFields,
      fieldChanges,
    });
  }

  async triggerIntelligenceCreateRecords(payload: ICreateRecordsPayload) {
    const { reqParams, resolveData } = payload;
    const { tableId } = reqParams;
    const { records } = resolveData;

    // 获取启用了智能功能的字段
    const intelligenceFields = await this.getIntelligenceFields(tableId);
    if (intelligenceFields.length === 0) return;

    // 获取所有字段信息
    const fields = await this.fieldService.getFieldsByQuery(tableId);
    const fieldMap = this.createFieldMap(fields);

    // 按拓扑排序处理智能字段
    const sortedFields = this.topologicalSort(intelligenceFields);

    // 处理每条记录
    for (const record of records) {
      const recordData = Object.entries(record.fields).reduce(
        (acc, [fieldId, value]) => {
          const dbFieldName = fieldMap[fieldId];
          if (dbFieldName) {
            acc[dbFieldName] = value;
          }
          return acc;
        },
        {} as Record<string, unknown>
      );

      // 串行处理每个智能字段
      for (const field of sortedFields) {
        await this.processField(tableId, record.id, recordData, field, {
          fieldMap,
          fields: fields as IField[],
        });
      }
    }
  }

  private getRecordsToProcess(fieldChanges: IFieldChangesMap) {
    const recordIds = new Set<string>();
    fieldChanges.forEach((recordMap) => {
      recordMap.forEach((_, recordId) => recordIds.add(recordId));
    });
    return Array.from(recordIds);
  }

  private async processRecords(tableId: string, recordIds: string[], context: IProcessContext) {
    const { fieldMap, fields, sortedFields, fieldChanges } = context;
    const batchSize = 3; // 减小批次大小

    // 将记录分批处理
    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize);
      const recordDataBatch = batch.map((recordId) =>
        this.buildRecordData(recordId, fieldMap, fieldChanges)
      );

      // 串行处理每个批次中的记录
      for (let j = 0; j < recordDataBatch.length; j++) {
        await this.processRecordFields(tableId, batch[j], recordDataBatch[j], {
          fieldMap,
          fields,
          sortedFields,
        });
      }

      // 添加小延迟，避免数据库压力过大
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private buildRecordData(
    recordId: string,
    fieldMap: Record<string, string>,
    fieldChanges: IFieldChangesMap
  ): Record<string, unknown> {
    const recordData: Record<string, unknown> = {};
    fieldChanges.forEach((recordMap, fieldId) => {
      const dbFieldName = fieldMap[fieldId];
      if (dbFieldName && recordMap.has(recordId)) {
        recordData[dbFieldName] = recordMap.get(recordId)?.newValue;
      }
    });
    return recordData;
  }

  private async processRecordFields(
    tableId: string,
    recordId: string,
    recordData: Record<string, unknown>,
    context: {
      fieldMap: Record<string, string>;
      fields: IField[];
      sortedFields: IIntelligenceField[];
    }
  ) {
    const { fieldMap, fields, sortedFields } = context;

    // 按照拓扑排序的顺序串行处理字段
    // 因为字段之间可能存在依赖关系，所以这里不能并行
    for (const field of sortedFields) {
      await this.processField(tableId, recordId, recordData, field, { fieldMap, fields });
    }
  }

  private async processField(
    tableId: string,
    recordId: string,
    recordData: Record<string, unknown>,
    field: IIntelligenceField,
    context: IFieldProcessContext
  ) {
    const { fieldMap, fields } = context;
    const { fieldId, options } = field;
    const { intelligence } = options;
    const fieldName = fields.find((f) => f.id === fieldId)?.name;

    if (!this.validateFieldProcessing(fieldName, intelligence)) return;

    try {
      if (this.hasMissingDependencies(intelligence!, fieldMap, recordData)) {
        this.logger.warn(`Missing dependencies for record ${recordId}, field ${fieldId}`);
        return;
      }

      const result = await this.generateFieldValue(recordData, {
        fieldMap,
        intelligence: intelligence!,
      });

      await this.updateFieldStatus(tableId, recordId, fieldName!, result);
    } catch (error) {
      this.logger.error(`Error processing record ${recordId} for field ${fieldId}`, error);
      await this.updateFieldStatus(tableId, recordId, fieldName!, this.thinkingFailedMessage);
    }
  }

  private validateFieldProcessing(
    fieldName?: string,
    intelligence?: IIntelligenceOptions
  ): boolean {
    return !!(fieldName && intelligence?.prompt && intelligence.dynamicDepends);
  }

  private hasMissingDependencies(
    intelligence: IIntelligenceOptions,
    fieldMap: Record<string, string>,
    recordData: Record<string, unknown>
  ): boolean {
    return (
      intelligence?.dynamicDepends?.some((dependFieldId) => {
        const dbFieldName = fieldMap[dependFieldId];
        return !(dbFieldName in recordData);
      }) ?? false
    );
  }

  private async generateFieldValue(
    recordData: Record<string, unknown>,
    context: {
      fieldMap: Record<string, string>;
      intelligence: IIntelligenceOptions;
    }
  ): Promise<string> {
    const { fieldMap, intelligence } = context;
    // todo: 无法处理的数据需要跳过
    const processedPrompt = this.replacePlaceholders(recordData, {
      fieldMap,
      dynamicDepends: intelligence.dynamicDepends!,
      prompt: intelligence.prompt!,
    });

    const config = await this.aiService.getAIConfig();
    const currentTaskModel = TASK_MODEL_MAP.coding;
    const modelKey = config[currentTaskModel as keyof typeof config] as string;
    const modelInstance = await this.aiService.getModelInstance(modelKey, config.llmProviders);

    const result = await generateText({
      model: modelInstance,
      prompt: processedPrompt,
    });

    return result.text;
  }

  private async updateFieldStatus(
    tableId: string,
    recordId: string,
    fieldName: string,
    value: string
  ) {
    await this.recordOpenApiService.updateRecord(tableId, recordId, {
      record: {
        fields: {
          [fieldName]: value,
        },
      },
    });
  }

  private groupCellChangesByField(cellContexts: ICellContext[]) {
    const fieldChanges = new Map<string, Map<string, { newValue: unknown; oldValue: unknown }>>();

    for (const { fieldId, recordId, newValue, oldValue } of cellContexts) {
      // 移除新旧值相等的判断，因为我们需要处理从空值更新到有值的情况
      if (!fieldChanges.has(fieldId)) {
        fieldChanges.set(fieldId, new Map());
      }

      // 当 oldValue 为空且 newValue 有值时，这是一个需要触发智能填充的场景
      if (oldValue == null || newValue !== oldValue) {
        fieldChanges.get(fieldId)!.set(recordId, { newValue, oldValue });
      }
    }

    return fieldChanges;
  }

  private async getIntelligenceFields(tableId: string): Promise<IIntelligenceField[]> {
    const fields = await this.fieldService.getFieldsByQuery(tableId);

    return fields
      .filter((field) => {
        const options = field.options as { intelligence?: IIntelligenceOptions };
        return options?.intelligence?.enabled;
      })
      .map((field) => ({
        fieldId: field.id,
        options: field.options as { intelligence?: IIntelligenceOptions },
      }));
  }

  private getAffectedIntelligenceFields(
    intelligenceFields: IIntelligenceField[],
    fieldChanges: IFieldChangesMap
  ): IIntelligenceField[] {
    return intelligenceFields.filter((field) => {
      const { intelligence } = field.options;
      if (!intelligence?.dynamicDepends) return false;

      // 检查是否有依赖字段从空值变为有值
      return intelligence.dynamicDepends.some((dependsFieldId) => {
        const changes = fieldChanges.get(dependsFieldId);
        if (!changes) return false;

        // 检查是否有任何记录的依赖字段从空值变为有值
        return Array.from(changes.values()).some(({ oldValue, newValue }) => {
          // 如果新值为空，直接返回false
          if (newValue == null || newValue === '') {
            return false;
          }
          // 当新旧值不一致时返回true
          return oldValue !== newValue;
        });
      });
    });
  }

  topologicalSort(
    affectedIntelligenceFields: {
      fieldId: string;
      options: { intelligence?: IIntelligenceOptions };
    }[]
  ) {
    // 构建邻接表
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // 初始化
    affectedIntelligenceFields.forEach(({ fieldId }) => {
      graph.set(fieldId, []);
      inDegree.set(fieldId, 0);
    });

    // 构建依赖关系
    affectedIntelligenceFields.forEach(({ fieldId, options }) => {
      const dependsOn = options.intelligence?.dynamicDepends || [];
      dependsOn.forEach((dependFieldId) => {
        // 只处理在受影响字段中的依赖
        if (graph.has(dependFieldId)) {
          graph.get(dependFieldId)?.push(fieldId);
          inDegree.set(fieldId, (inDegree.get(fieldId) || 0) + 1);
        }
      });
    });

    // 拓扑排序
    const queue: string[] = [];
    const result: typeof affectedIntelligenceFields = [];

    // 找出入度为0的节点
    inDegree.forEach((degree, fieldId) => {
      if (degree === 0) {
        queue.push(fieldId);
      }
    });

    while (queue.length) {
      const fieldId = queue.shift()!;
      const field = affectedIntelligenceFields.find((f) => f.fieldId === fieldId);
      if (field) {
        result.push(field);
      }

      // 更新相邻节点的入度
      graph.get(fieldId)?.forEach((neighbor) => {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  }
}
