import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@teable/ui-lib';
import { PlusIcon } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useFields, useFieldStaticGetter } from '../../../../hooks';

interface IFieldSelectorProps {
  currentFieldId?: string;
  onSelect?: (field: { id: string; name: string }) => void;
}

export const FieldSelector = ({ currentFieldId, onSelect }: IFieldSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const fields = useFields({ withHidden: true, withDenied: true });
  const getFieldStatic = useFieldStaticGetter();

  const availableFields = useMemo(() => {
    const filtered = fields.filter((field) => field.id !== currentFieldId);
    if (!search) return filtered;

    return filtered.filter((field) => field.name.toLowerCase().includes(search.toLowerCase()));
  }, [fields, currentFieldId, search]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="xs" className="h-7 gap-1 px-2">
          <PlusIcon className="size-3.5" />
          <span className="text-xs">字段</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-0">
        <div className="border-b p-2">
          <Input
            placeholder="搜索字段..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="max-h-48 overflow-auto py-1">
          {availableFields.length === 0 ? (
            <div className="px-2 py-1.5 text-center text-xs text-muted-foreground">
              未找到相关字段
            </div>
          ) : (
            availableFields.map((field) => {
              const { Icon } = getFieldStatic(field.type, false);
              return (
                <DropdownMenuItem
                  key={field.id}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs"
                  onSelect={() => {
                    onSelect?.(field);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{field.name}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
