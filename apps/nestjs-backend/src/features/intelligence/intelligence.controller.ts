import { Body, Controller, Post } from '@nestjs/common';
import type { IIntelligenceOptions } from '@teable/core';
import { IntelligenceService } from './intelligence.service';

@Controller('api/intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Post('/generate-stream')
  async generateStream(@Body() body: { prompt: string }) {
    return this.intelligenceService.generateStream(body.prompt);
  }

  @Post('/generate-batch')
  async generateBatch(
    @Body() data: { tableId: string; fieldId: string; options: IIntelligenceOptions }
  ) {
    return await this.intelligenceService.generateBatch(data.tableId, data.fieldId, data.options);
  }
}
