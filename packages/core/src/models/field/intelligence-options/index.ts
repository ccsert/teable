import { z } from '../../../zod';
import type { IRecord } from '../../record';
import { FieldType } from '../constant';

// 暂时只支持单行文本和长文本
export const intelligenceOptionsType = {
  [FieldType.SingleLineText]: 'singleLineText',
  [FieldType.LongText]: 'longText',
} as const;

// 智能方法的元数据定义
export interface IIntelligenceMethodMeta {
  // 方法名称
  name: string;
  // 方法描述
  description: string;
  // 方法实现函数类型
  handler: (
    prompt: string,
    context?: IRecord,
    callback?: (prompt: string, context?: IRecord) => string
  ) => Promise<string>;
  // 返回值类型
  returnType: 'string' | 'number' | 'boolean';
  // 是否支持动态更新
  supportDynamic: boolean;
}

// 接入的实现方法
export enum IntelligenceMethod {
  // 普通文本文本生成，基于prompt
  TextGeneration = 'textGeneration',
}

// 智能方法的元数据
export const intelligenceMethodMeta: Record<IntelligenceMethod, IIntelligenceMethodMeta> = {
  [IntelligenceMethod.TextGeneration]: {
    name: '自定义ai自动填充',
    description: '通过用户自定义提示词，自动填充字段内容',
    handler: async (
      prompt: string,
      context?: IRecord,
      callback?: (prompt: string, context?: IRecord) => string
    ) => {
      return callback ? callback(prompt, context) : '处理中...';
    },
    returnType: 'string',
    supportDynamic: true,
  },
};

export const intelligenceOptionsSchema = z.object({
  // 是否启用
  enabled: z.boolean().optional(),
  // 提示词
  prompt: z.string().optional(),
  // 对应的表格列类型
  type: z.nativeEnum(intelligenceOptionsType).optional(),
  // 是否根据其他数据变化动态生成
  dynamic: z.boolean().optional(),
  // 动态生成时，依赖的数据
  dynamicDepends: z.array(z.string()).optional(),
  // 接入的实现方法
  method: z.nativeEnum(IntelligenceMethod).optional(),
});

export type IIntelligenceOptions = z.infer<typeof intelligenceOptionsSchema>;
