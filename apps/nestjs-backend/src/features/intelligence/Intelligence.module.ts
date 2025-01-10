import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { FieldModule } from '../field/field.module';
import { RecordOpenApiModule } from '../record/open-api/record-open-api.module';
import { IntelligenceService } from './intelligence.service';

@Module({
  providers: [IntelligenceService],
  exports: [IntelligenceService],
  imports: [AiModule, FieldModule, RecordOpenApiModule],
})
export class IntelligenceModule {}
