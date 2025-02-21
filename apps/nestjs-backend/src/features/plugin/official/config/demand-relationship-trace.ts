import { PluginPosition } from '@teable/openapi';
import type { IOfficialPluginConfig } from './types';

export const demandRelationshipTraceConfig: IOfficialPluginConfig = {
  id: 'plgdemandrelationshiptrace',
  name: 'Demand Relationship Trace',
  description: 'Demand Relationship Trace',
  detailDesc: `
  The demand relationship trace app helps you understand the relationships between different demands.

  It displays a list of demands and their relationships, allowing you to see how one demand is connected to another.

  This can be useful for analyzing dependencies, identifying potential conflicts, or tracking the flow of requirements through your project.
  `,
  helpUrl: 'https://help.teable.io',
  positions: [PluginPosition.View],
  i18n: {
    zh: {
      name: '需求关系追踪',
      helpUrl: 'https://help.teable.cn',
      description: '需求关系追踪',
      detailDesc:
        '需求关系追踪应用帮助您理解不同需求之间的关系。\n\n它显示了一系列需求及其关系，让您可以看到一个需求如何连接到另一个需求。\n\n这有助于分析依赖关系、识别潜在冲突或跟踪需求在整个项目中的流动。',
    },
  },
  logoPath: 'static/plugin/demand-relationship-trace.png',
  pluginUserId: 'plgdemandrelationshiptraceuser',
  avatarPath: 'static/plugin/demand-relationship-trace.png',
};
