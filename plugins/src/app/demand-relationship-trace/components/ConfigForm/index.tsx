import { zodResolver } from '@hookform/resolvers/zod';
import { FieldEditor, useBaseId, useTableId, useTables, useFields, LinkField } from '@teable/sdk';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@teable/ui-lib/dist/shadcn';
import { Button } from '@teable/ui-lib/dist/shadcn/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@teable/ui-lib/dist/shadcn/ui/form';
import { useState, useCallback, useMemo } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { IFieldInfo, IConfigFormProps } from '../../types';

import { InputRelations } from './InputRelations';
import { OutputRelations } from './OutputRelations';
import { createFormSchema } from './schema';
import type { FormValues } from './schema';

export const ConfigForm = ({ config, onConfigChange }: IConfigFormProps) => {
  const { t } = useTranslation();
  const baseId = useBaseId();
  const tableId = useTableId();
  const tables = useTables();
  const formSchema = createFormSchema({ tables });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      analysisMode: config.analysisMode,
      promptText: config.promptText || '',
      relations: config.relations,
    },
  });

  const [sharedDisplayFields, setSharedDisplayFields] = useState<Record<string, IFieldInfo[]>>({});

  const updateSharedDisplayFields = useCallback((tableId: string, fields: IFieldInfo[]) => {
    setSharedDisplayFields((prev) => ({
      ...prev,
      [tableId]: fields,
    }));
  }, []);

  const clearSharedDisplayFields = useCallback((tableId: string) => {
    setSharedDisplayFields((prev) => {
      const newState = { ...prev };
      delete newState[tableId];
      return newState;
    });
  }, []);

  const analysisMode = form.watch('analysisMode');
  const relations = form.watch('relations');

  // 获取可用的输入表
  const availableInputTables = useMemo(() => {
    const inputTableIds = new Set(relations.filter((r) => !r.isAuto).map((r) => r.tableId));
    return (tables || []).filter((table) => !inputTableIds.has(table.id));
  }, [tables, relations]);

  // 获取当前表的所有关联字段（输出关系）
  const fields = useFields({ withHidden: true, withDenied: true });
  const outputFields = useMemo(
    () => fields?.filter((field): field is LinkField => field instanceof LinkField) || [],
    [fields]
  );

  // 按表分组的输出字段
  const outputTableFields = useMemo(() => {
    const tableMap = new Map<string, { tableId: string; fields: LinkField[] }>();

    outputFields.forEach((field) => {
      const tableId = field.options.foreignTableId;
      if (!tableMap.has(tableId)) {
        tableMap.set(tableId, { tableId, fields: [] });
      }
      tableMap.get(tableId)?.fields.push(field);
    });

    return Array.from(tableMap.values());
  }, [outputFields]);

  const onSubmit = (values: FormValues) => {
    try {
      onConfigChange({
        ...values,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const onError = (errors: FieldErrors<FormValues>) => {
    console.error('Form validation errors:', errors);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
        <FormField
          control={form.control}
          name="analysisMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('analysisMode')}</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectAnalysisMode')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intelligent">{t('intelligentAnalysis')}</SelectItem>
                    <SelectItem value="static">{t('staticAnalysis')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {analysisMode === 'intelligent' && (
          <FormField
            control={form.control}
            name="promptText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('promptText')}</FormLabel>
                <FormControl>
                  <FieldEditor
                    label={t('promptText')}
                    value={field.value || ''}
                    placeholder={t('enterPrompt')}
                    onUpdate={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {analysisMode === 'static' && (
          <FormField
            control={form.control}
            name="relations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('relationConfig')}</FormLabel>
                <div className="space-y-4">
                  <OutputRelations
                    baseId={baseId!}
                    tableId={tableId!}
                    outputTableFields={outputTableFields}
                    form={form}
                    relations={relations}
                    onUpdateRelations={field.onChange}
                    sharedDisplayFields={sharedDisplayFields}
                    updateSharedDisplayFields={updateSharedDisplayFields}
                    clearSharedDisplayFields={clearSharedDisplayFields}
                  />

                  <InputRelations
                    baseId={baseId!}
                    tableId={tableId!}
                    form={form}
                    relations={relations}
                    onUpdateRelations={field.onChange}
                    sharedDisplayFields={sharedDisplayFields}
                    updateSharedDisplayFields={updateSharedDisplayFields}
                    clearSharedDisplayFields={clearSharedDisplayFields}
                    availableInputTables={availableInputTables}
                  />
                </div>
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={!form.formState.isValid}>
          {t('startAnalysis')}
        </Button>

        {form.formState.errors.relations?.message && (
          <div className="text-sm text-destructive">
            {(form.formState.errors.relations.message as string).includes('|')
              ? t((form.formState.errors.relations.message as string).split('|')[0], {
                  tables: (form.formState.errors.relations.message as string).split('|')[1],
                })
              : t(form.formState.errors.relations.message as string)}
          </div>
        )}
      </form>
    </Form>
  );
};
