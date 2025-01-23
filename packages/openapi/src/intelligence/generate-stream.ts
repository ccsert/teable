import { registerRoute } from '../utils';
import { z } from '../zod';

export const INTELLIGENCE_GENERATE_STREAM = '/intelligence/generate-stream';
export const intelligenceGenerateStreamRoSchema = z.object({
  prompt: z.string(),
});

export type IIntelligenceGenerateStreamRo = z.infer<typeof intelligenceGenerateStreamRoSchema>;

export const intelligenceGenerateStreamVoSchema = z.object({
  result: z.string(),
});

export type IIntelligenceGenerateStreamVo = z.infer<typeof intelligenceGenerateStreamVoSchema>;

export const intelligenceGenerateStreamRoute = registerRoute({
  method: 'post',
  path: INTELLIGENCE_GENERATE_STREAM,
  description: 'Generate intelligence stream',
  request: {
    body: {
      content: {
        'application/json': {
          schema: intelligenceGenerateStreamRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Returns intelligence stream.',
      content: {
        'application/json': {
          schema: intelligenceGenerateStreamVoSchema,
        },
      },
    },
  },
});

export const intelligenceGenerateStream = (
  intelligenceGenerateStreamRo: IIntelligenceGenerateStreamRo
) => {
  return fetch(INTELLIGENCE_GENERATE_STREAM, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(intelligenceGenerateStreamRo),
  });
};
