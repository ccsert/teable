import { intelligenceOptionsSchema } from '@teable/core';
import { axios } from '../axios';
import { registerRoute } from '../utils';
import { z } from '../zod';

export const INTELLIGENCE_GENERATE_BATCH = '/intelligence/generate-batch';

export const intelligenceGenerateBatchRoSchema = z.object({
  tableId: z.string(),
  fieldId: z.string(),
  options: intelligenceOptionsSchema,
});

export type IIntelligenceGenerateBatchRo = z.infer<typeof intelligenceGenerateBatchRoSchema>;

export const intelligenceGenerateBatchVoSchema = z.object({
  message: z.string(),
});

export type IIntelligenceGenerateBatchVo = z.infer<typeof intelligenceGenerateBatchVoSchema>;

export const intelligenceGenerateBatchRoute = registerRoute({
  method: 'post',
  path: INTELLIGENCE_GENERATE_BATCH,
  description: 'Generate intelligence batch',
  request: {
    body: {
      content: {
        'application/json': {
          schema: intelligenceGenerateBatchRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Returns intelligence batch.',
      content: {
        'application/json': {
          schema: intelligenceGenerateBatchVoSchema,
        },
      },
    },
  },
});

export const intelligenceGenerateBatch = (
  intelligenceGenerateBatchRo: IIntelligenceGenerateBatchRo
) => {
  return axios.post<IIntelligenceGenerateBatchVo>(
    INTELLIGENCE_GENERATE_BATCH,
    intelligenceGenerateBatchRo
  );
};
