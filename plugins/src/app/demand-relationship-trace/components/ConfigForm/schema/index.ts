import type { Table } from '@teable/sdk';
import * as z from 'zod';
import type { ITableRelation } from '../../../types';

const tableRelationSchema = z.object({
  tableId: z.string().min(1, 'Table is required'),
  fieldId: z.string().min(1, 'Relation field is required'),
  fieldName: z.string().optional(),
  targetTableId: z.string().optional(),
  isAuto: z.boolean().optional(),
  displayFields: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        isLookup: z.boolean().optional(),
      })
    )
    .min(1, 'At least one display field is required'),
}) satisfies z.ZodType<ITableRelation>;

interface ICreateFormSchemaProps {
  tables?: Table[];
}

export const createFormSchema = ({ tables }: ICreateFormSchemaProps = {}) => {
  const getTableName = (tableId: string) => {
    return tables?.find((t) => t.id === tableId)?.name || tableId;
  };

  return z.object({
    analysisMode: z.enum(['intelligent', 'static']),
    promptText: z.string().optional(),
    relations: z
      .array(tableRelationSchema)
      .refine(
        (relations) => {
          const hasInput = relations.some((r) => !r.isAuto);
          const hasOutput = relations.some((r) => r.isAuto);
          return hasInput && hasOutput;
        },
        {
          message: 'At least one input and one output relation is required',
        }
      )
      .refine(
        (relations) => {
          const incompleteRelations = relations.filter((relation) => {
            return !relation.fieldId || !relation.displayFields?.length;
          });
          return incompleteRelations.length === 0;
        },
        (relations) => {
          const incompleteTableIds = Array.from(
            new Set(
              relations
                .filter((relation) => !relation.fieldId || !relation.displayFields?.length)
                .map((r) => r.tableId)
            )
          );

          return {
            message: `incompleteTablesConfig|${incompleteTableIds
              .map((id) => getTableName(id))
              .join(', ')}`,
          };
        }
      ),
  });
};

export type FormValues = z.infer<ReturnType<typeof createFormSchema>>;
