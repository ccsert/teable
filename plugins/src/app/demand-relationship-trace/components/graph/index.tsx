'use client';
import G6 from '@antv/g6';
import type { Graph as G6Graph } from '@antv/g6';
import { FieldKeyType } from '@teable/core';
import type { RecordCore } from '@teable/core';
import { getRecords } from '@teable/openapi';
import { useFields, useRecords } from '@teable/sdk';
import { useSize } from 'ahooks';
import { insertCss } from 'insert-css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { IConfig, IFieldInfo, ITableRelation } from '../../types';

interface IGraphProps {
  config: IConfig;
}

interface IRecordVo {
  id: string;
  fields: Record<string, unknown>;
  name?: string | undefined;
  autoNumber?: number | undefined;
  createdTime?: string | undefined;
  lastModifiedTime?: string | undefined;
  createdBy?: string | undefined;
  lastModifiedBy?: string | undefined;
}
interface INode {
  id: string;
  label: string;
  style: {
    fill: string;
  };
  recordId?: string;
  tableId: string;
  //   data: Record<string, string>;
}

interface IEdge {
  source: string;
  target: string;
  label: string;
}

// 将复杂的数据处理逻辑拆分成小函数
const buildNodeIdByRecordLabel = (record: RecordCore, fieldsMap: Map<string, string>) => {
  // 剔除fields中vlaue为对象和数组的
  const fields = Object.fromEntries(
    Object.entries(record.fields).filter(
      ([_, value]) => typeof value !== 'object' && !Array.isArray(value)
    )
  );
  return Object.entries(fields)
    .map(([key, value]) => `${fieldsMap.get(key)}: ${value}`)
    .join('\n');
};

const buildNodeByRecordLabel = (record: IRecordVo) => {
  // 剔除fields中vlaue为对象和数组的
  const fields = Object.fromEntries(
    Object.entries(record.fields).filter(
      ([_, value]) => typeof value !== 'object' && !Array.isArray(value)
    )
  );
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};

const Graph: React.FC<IGraphProps> = ({ config }) => {
  // 更新小地图样式
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const css = `
        .g6-minimap-container {
          border: 1px solid #e2e2e2;
          position: absolute !important;
          right: 16px !important;
          bottom: 16px !important;
          left: auto !important;
          top: auto !important;
        }
        .g6-minimap-viewport {
          border: 2px solid rgb(25, 128, 255);
        }
      `;
      insertCss(css);
    }
  }, []);
  // 获取输出关系的字段
  const outputRelationFields = useMemo(() => {
    return config.relations
      .filter((relation) => relation.isAuto)
      .map((relation) => relation.fieldId);
  }, [config.relations]);
  // 获取输入关系的字段
  const inputRelationFields = useMemo(() => {
    return config.relations
      .filter((relation) => !relation.isAuto)
      .map((relation) => ({
        fieldName: relation.fieldName,
        tableId: relation.tableId,
      }));
  }, [config.relations]);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph>();
  const size = useSize(containerRef);

  // 获取当前表的记录
  const { records } = useRecords(
    {
      fieldKeyType: FieldKeyType.Name,
    },
    []
  );

  const fields = useFields({ withHidden: true, withDenied: true });

  const fieldsMap = useMemo(() => {
    return new Map(fields.map((field) => [field.id, field.name]));
  }, [fields]);

  // 获取关联表的配置和字段
  const tables = useMemo(() => {
    const tablesMap = new Map<
      string,
      { fields: IFieldInfo[]; isAuto: boolean; relation: ITableRelation }
    >();
    config.relations.forEach((relation) => {
      const linkField = {
        name: relation.fieldName || '',
        id: relation.fieldId,
        type: 'link',
        isLookup: true,
      };
      tablesMap.set(relation.tableId, {
        fields: [linkField, ...(relation.displayFields ?? [])],
        isAuto: relation.isAuto ?? false,
        relation,
      });
    });

    return tablesMap;
  }, [config.relations]);

  // 获取关联表的记录
  const [recordMap, setRecordMap] = useState<Map<string, IRecordVo[]>>(new Map());
  useEffect(() => {
    const loadRecords = async () => {
      const promises = Array.from(tables.entries()).map(async ([tableId, table]) => {
        const projection = table.fields.map((field) => field.name);
        const res = await getRecords(tableId, { projection });
        return [tableId, res.data.records] as const;
      });

      const results = await Promise.all(promises);
      setRecordMap(new Map(results));
    };

    loadRecords();
  }, [tables]);
  // 简化 buildGraphData 函数
  const buildGraphData = useMemo(
    () => (records: RecordCore[], recordMap: Map<string, IRecordVo[]>) => {
      const allNodes: INode[] = [];
      const allEdges: IEdge[] = [];

      // 遍历所有记录，处理输出关系
      records.forEach((record) => {
        const displayFields = buildNodeIdByRecordLabel(record, fieldsMap);

        // 只添加一次节点
        allNodes.push({
          id: record.id,
          label: displayFields,
          tableId: config.relations[0].tableId,
          style: { fill: '#e6f7ff' },
        });

        // 处理输出关系
        outputRelationFields.forEach((fieldId) => {
          const field = fieldsMap.get(fieldId);
          if (!field) return;

          const linkedRecords = record.fields[fieldId] as { id: string; title: string }[];
          if (!linkedRecords || !Array.isArray(linkedRecords)) return;

          linkedRecords.forEach((linkedRecord) => {
            allEdges.push({
              source: record.id,
              target: linkedRecord.id,
              label: field,
            });
          });
        });
      });
      // 遍历所有关联表，处理输入记录
      recordMap.forEach((records, tableId) => {
        records.forEach((record) => {
          allNodes.push({
            id: record.id,
            label: buildNodeByRecordLabel(record),
            tableId,
            style: { fill: '#f0f5ff' },
          });
          // 处理输入关系
          inputRelationFields.forEach((relation) => {
            if (relation.tableId !== tableId) return;
            if (!relation.fieldName) return;
            const field = record.fields[relation.fieldName];
            if (!field) return;

            const linkedRecords = field as {
              id: string;
              title: string;
            }[];

            if (!linkedRecords || !Array.isArray(linkedRecords)) return;

            linkedRecords.forEach((linkedRecord) => {
              allEdges.push({
                source: record.id,
                target: linkedRecord.id,
                label: relation.fieldName!,
              });
            });
          });
        });
      });

      return {
        nodes: Array.from(new Map(allNodes.map((node) => [node.id, node])).values()),
        edges: allEdges,
        id: 'root',
      };
    },
    [config, fieldsMap, inputRelationFields, outputRelationFields]
  );
  // 初始化图实例
  useEffect(() => {
    if (!containerRef.current || !size) return;

    graphRef.current = new G6.Graph({
      container: containerRef.current,
      width: size.width,
      height: size.height,
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
      },
      layout: {
        type: 'dagre',
        rankdir: 'LR',
        nodesep: 25,
        ranksep: 40,
        preventOverlap: true,
      },
      defaultNode: {
        type: 'rect',
        size: [180, 60],
        style: {
          radius: 8,
          fill: '#fff',
          stroke: '#91d5ff',
          lineWidth: 2,
          cursor: 'pointer',
        },
      },
      defaultEdge: {
        type: 'polyline',
        style: {
          radius: 10,
          offset: 15,
          endArrow: true,
          lineWidth: 2,
          stroke: '#91d5ff',
        },
      },
      plugins: [
        new G6.Minimap({
          size: [150, 100],
        }),
      ],
      // 添加缩放限制
      minZoom: 0.2,
      maxZoom: 5,
      // 添加动画配置
      animate: true,
      animateCfg: {
        duration: 500,
        easing: 'easeCubic',
      },
      fitView: true,
      fitViewPadding: [20, 20, 20, 20],
    });

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
      }
    };
  }, [size]);

  // 更新渲染逻辑
  useEffect(() => {
    if (!graphRef.current || !records.length) return;
    const graphData = buildGraphData(records, recordMap);
    if (graphData) {
      graphRef.current.clear(); // 清除之前的内容
      graphRef.current.data(graphData);
      graphRef.current.render();
      graphRef.current.fitView();
    }
  }, [records, recordMap, buildGraphData]);

  return (
    <div className="relative h-[calc(100vh-120px)] w-full overflow-hidden">
      <div ref={containerRef} className="size-full" />
    </div>
  );
};

export default Graph;
