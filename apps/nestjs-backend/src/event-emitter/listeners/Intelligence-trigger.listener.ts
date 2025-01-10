import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IIntelligenceOptions } from '@teable/core';
import { IntelligenceService } from '../../features/intelligence/intelligence.service';
import { IUpdateRecordsPayload } from '../../features/undo-redo/operations/update-records.operation';
import { Events, FieldCreateEvent } from '../events';
type IFieldOptions = {
  intelligence?: IIntelligenceOptions;
};
@Injectable()
export class IntelligenceTriggerListener {
  private readonly logger = new Logger(IntelligenceTriggerListener.name);

  constructor(private readonly intelligenceService: IntelligenceService) {}

  @OnEvent(Events.TABLE_FIELD_CREATE, { async: true })
  async fieldCreateListener(listenerEvent: FieldCreateEvent) {
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
  }

  @OnEvent(Events.OPERATION_RECORDS_UPDATE, { async: true })
  async recordUpdateListener(payload: IUpdateRecordsPayload) {
    await this.intelligenceService.triggerIntelligenceUpdate(payload);
  }
}
