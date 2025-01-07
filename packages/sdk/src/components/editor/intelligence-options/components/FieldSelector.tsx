import type { FieldType } from '@teable/core';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@teable/ui-lib';
import { PlusIcon } from 'lucide-react';
import { useFields, useFieldStaticGetter } from '../../../../hooks';

interface IFieldSelectorProps {
  onSelect: (field: { id: string; name: string; type: FieldType }) => void;
  currentFieldId?: string;
  triggerClassName?: string;
}

export const FieldSelector: React.FC<IFieldSelectorProps> = ({
  onSelect,
  currentFieldId,
  triggerClassName,
}) => {
  const fields = useFields({ withHidden: true, withDenied: true });
  const getFieldStatic = useFieldStaticGetter();

  const availableFields = fields.filter((field) => field.id !== currentFieldId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <PlusIcon className="mr-1 size-4" />
          添加字段
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="end">
        <Command>
          <CommandInput placeholder="搜索字段..." className="h-9" />
          <CommandEmpty>未找到相关字段</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {availableFields.map((field) => {
              const { Icon } = getFieldStatic(field.type, false);
              return (
                <CommandItem key={field.id} value={field.name} onSelect={() => onSelect(field)}>
                  <Icon className="mr-2 size-4 shrink-0" />
                  <span className="truncate">{field.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
