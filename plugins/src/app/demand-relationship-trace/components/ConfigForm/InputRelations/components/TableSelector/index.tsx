import { Button, Popover, PopoverContent, PopoverTrigger } from '@teable/ui-lib/dist/shadcn';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@teable/ui-lib/dist/shadcn/ui/command';
import { ChevronsUpDown } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITableRelation } from '../../../../../types';
import type { ITableSelectorProps } from './types';

export const TableSelector: React.FC<ITableSelectorProps> = ({
  availableInputTables,
  relations,
  onUpdateRelations,
}) => {
  const { t } = useTranslation();
  const [tableSelectOpen, setTableSelectOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  return (
    <div className="flex gap-2">
      <Popover open={tableSelectOpen} onOpenChange={setTableSelectOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={tableSelectOpen}
            className="w-full justify-between"
          >
            {t('selectInputTable')}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" side="bottom" align="start">
          <Command>
            <CommandInput
              placeholder={t('searchTables')}
              className="h-9"
              value={tableSearch}
              onValueChange={setTableSearch}
            />
            <CommandEmpty>{t('noTablesFound')}</CommandEmpty>
            <CommandList>
              {availableInputTables.map((table) => (
                <CommandItem
                  key={table.id}
                  value={table.id}
                  onSelect={(value) => {
                    if (!relations.some((r: ITableRelation) => !r.isAuto && r.tableId === value)) {
                      const sharedRelation = relations.find(
                        (r: ITableRelation) => r.isAuto && r.tableId === value
                      );

                      onUpdateRelations([
                        ...relations,
                        {
                          tableId: value,
                          fieldId: '',
                          isAuto: false,
                          displayFields: sharedRelation?.displayFields,
                        },
                      ]);
                    }
                    setTableSelectOpen(false);
                  }}
                >
                  <span>{table.name}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
