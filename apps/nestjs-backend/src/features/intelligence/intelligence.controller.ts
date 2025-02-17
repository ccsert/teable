import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import type { IIntelligenceOptions } from '@teable/core';
import { Response } from 'express';
import { ClsService } from 'nestjs-cls';
import type { IClsStore } from '../../types/cls';
import { IntelligenceService } from './intelligence.service';

@Controller('api/intelligence')
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: IntelligenceService,
    private readonly cls: ClsService<IClsStore>
  ) {}

  @Post('/generate-stream/:baseId')
  async generateStream(
    @Body() body: { prompt: string },
    @Res() res: Response,
    @Param('baseId') baseId: string
  ) {
    const result = await this.intelligenceService.generateStream(body.prompt, baseId);
    result.pipeTextStreamToResponse(res);
  }

  @Post('/generate-batch')
  async generateBatch(
    @Body() data: { tableId: string; fieldId: string; options: IIntelligenceOptions }
  ) {
    this.cls.set('entry', { type: 'intelligence_controller', id: data.tableId });
    return await this.intelligenceService.generateBatch(data.tableId, data.fieldId, data.options);
  }
}
