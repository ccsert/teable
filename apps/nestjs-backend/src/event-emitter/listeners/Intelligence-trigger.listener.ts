import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IIntelligenceOptions } from '@teable/core';
import { IntelligenceService } from '../../features/intelligence/intelligence.service';
import { ICreateRecordsPayload } from '../../features/undo-redo/operations/create-records.operation';
import { RecordUpdateEvent, Events, FieldCreateEvent } from '../events';
type IFieldOptions = {
  intelligence?: IIntelligenceOptions;
};
@Injectable()
export class IntelligenceTriggerListener {
  private readonly logger = new Logger(IntelligenceTriggerListener.name);
  // 是否正在处理fieldCreate事件
  private isFieldCreateUpdate = false;

  constructor(private readonly intelligenceService: IntelligenceService) {}

  @OnEvent(Events.TABLE_FIELD_CREATE, { async: true })
  async fieldCreateListener(listenerEvent: FieldCreateEvent) {
    try {
      this.isFieldCreateUpdate = true;
      this.logger.log('fieldCreateListener', listenerEvent);
      const {
        payload: { tableId, field },
      } = listenerEvent;

      this.logger.log('fieldCreateListener', tableId, field);

      if (Array.isArray(field)) {
        return;
      }

      const options = field.options as IFieldOptions;
      // 如果intelligence选项发生变化，则触发intelligence
      if (options?.intelligence && options.intelligence?.enabled) {
        await this.intelligenceService.triggerIntelligenceCreate(
          tableId,
          field.id,
          options?.intelligence as IIntelligenceOptions
        );
      }
    } finally {
      this.isFieldCreateUpdate = false;
    }
  }

  @OnEvent(Events.OPERATION_RECORDS_CREATE, { async: true })
  async recordCreateListener(payload: ICreateRecordsPayload) {
    await this.intelligenceService.triggerIntelligenceCreateRecords(payload);
  }

  @OnEvent(Events.TABLE_RECORD_UPDATE, { async: true })
  async oneRecordUpdateListener(listenerEvent: RecordUpdateEvent) {
    if (this.isFieldCreateUpdate) {
      return;
    }

    const { payload, context } = listenerEvent;
    const { tableId, record } = payload;
    const { user } = context;

    const records = Array.isArray(record) ? record : [record];
    const cellContexts = records.flatMap((rec) =>
      Object.entries(rec.fields).map(([fieldId, fieldValue]) => ({
        fieldId,
        recordId: rec.id,
        newValue: fieldValue.newValue || null,
        oldValue: fieldValue.oldValue || null,
      }))
    );

    if (cellContexts.length === 0) return;

    await this.intelligenceService.triggerIntelligenceUpdateRecords({
      tableId,
      windowId: '',
      userId: user?.id || '',
      recordIds: records.map((rec) => rec.id),
      fieldIds: [...new Set(cellContexts.map((ctx) => ctx.fieldId))],
      cellContexts,
    });
  }
}
