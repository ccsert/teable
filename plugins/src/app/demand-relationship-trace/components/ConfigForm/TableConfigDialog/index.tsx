import type { FieldType } from '@teable/core';
import { LinkField, useFields, useFieldStaticGetter } from '@teable/sdk';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Badge,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@teable/ui-lib/dist/shadcn';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@teable/ui-lib/dist/shadcn/ui/command';
import { Settings2, ChevronsUpDown, X } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITableConfigDialogProps } from './types';

export const TableConfigDialog = ({
  table,
  onUpdate,
  originalTableId,
}: ITableConfigDialogProps) => {
  const { t } = useTranslation();
  const [selectedFields, setSelectedFields] = useState(table.displayFields || []);

  const fields = useFields({ withHidden: true, withDenied: true });
  const getFieldStatic = useFieldStaticGetter();
  const [open, setOpen] = useState(false);
  const [fieldSelectOpen, setFieldSelectOpen] = useState(false);
  const [linkFieldSearch, setLinkFieldSearch] = useState('');
  const [displayFieldSearch, setDisplayFieldSearch] = useState('');

  useEffect(() => {
    setSelectedFields(table.displayFields || []);
  }, [table.displayFields]);

  const linkFields = useMemo(
    () =>
      fields
        ?.filter((field): field is LinkField => field instanceof LinkField)
        .filter((field) => field.options.foreignTableId === originalTableId) || [],
    [fields, originalTableId]
  );

  const otherFields = useMemo(
    () =>
      fields
        ?.filter((field) => !(field instanceof LinkField))
        .map((field) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          isLookup: field.isLookup,
        })) || [],
    [fields]
  );

  const filteredOtherFields = useMemo(() => {
    return otherFields
      ?.filter((field) => !selectedFields.some((f) => f.id === field.id))
      .filter((field) => field.name.toLowerCase().includes(displayFieldSearch.toLowerCase()));
  }, [otherFields, selectedFields, displayFieldSearch]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('tableConfig')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 关系字段选择 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{t('relationField')}</Label>
              <span className="text-xs text-muted-foreground">({t('relationFieldHint')})</span>
            </div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {table.fieldName || t('selectRelationField')}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" side="bottom" align="start">
                <Command>
                  <CommandInput
                    placeholder={t('searchFields')}
                    className="h-9"
                    value={linkFieldSearch}
                    onValueChange={setLinkFieldSearch}
                  />
                  <CommandEmpty>{t('noFieldsFound')}</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {linkFields.map((field) => (
                        <CommandItem
                          key={field.id}
                          value={field.id}
                          onSelect={(value) => {
                            onUpdate({
                              ...table,
                              fieldId: value,
                              fieldName: field.name,
                              targetTableId: field.options.foreignTableId,
                            });
                            setOpen(false);
                          }}
                        >
                          <span>{field.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 展示字段选择 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>{t('displayFields')}</Label>
              <span className="text-xs text-muted-foreground">({t('displayFieldsHint')})</span>
            </div>
            <Popover open={fieldSelectOpen} onOpenChange={setFieldSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={fieldSelectOpen}
                  className="w-full justify-between"
                >
                  {t('addDisplayField')}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" side="bottom" align="start">
                <Command>
                  <CommandInput
                    placeholder={t('searchFields')}
                    className="h-9"
                    value={displayFieldSearch}
                    onValueChange={setDisplayFieldSearch}
                  />
                  <CommandEmpty>{t('noFieldsFound')}</CommandEmpty>
                  <CommandList>
                    {filteredOtherFields?.map((field) => {
                      const Icon = getFieldStatic(field.type as FieldType, field.isLookup).Icon;
                      return (
                        <CommandItem
                          key={field.id}
                          value={field.id}
                          onSelect={(value) => {
                            const field = otherFields.find((f) => f.id === value);
                            if (field) {
                              const newFields = [...selectedFields, field];
                              setSelectedFields(newFields);
                              onUpdate({ ...table, displayFields: newFields });
                            }
                            setFieldSelectOpen(false);
                          }}
                        >
                          <Icon className="mr-2 size-4" />
                          <span>{field.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 已选择的展示字段 */}
          <div className="rounded-md border">
            {selectedFields.length > 0 ? (
              <div className="p-2">
                <div className="flex flex-wrap gap-2">
                  {selectedFields.map((field) => {
                    const Icon = getFieldStatic(field.type as FieldType, field.isLookup).Icon;
                    return (
                      <Badge
                        key={field.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="flex items-center gap-1">
                          <Icon className="size-3" />
                          <span>{field.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newFields = selectedFields.filter((f) => f.id !== field.id);
                            setSelectedFields(newFields);
                            onUpdate({ ...table, displayFields: newFields });
                          }}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                          aria-label={t('removeField')}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t('noFieldsSelected')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
