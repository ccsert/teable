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
  onSelect: (field: { id: string; name: string }) => void;
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
        <Button variant="outline" size="sm" className="gap-2">
          <PlusIcon className="size-4" />
          添加字段
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        <div className="p-2">
          <Input
            placeholder="搜索字段..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-[300px] overflow-auto">
          {availableFields.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">未找到相关字段</div>
          ) : (
            availableFields.map((field) => {
              const { Icon } = getFieldStatic(field.type, false);
              return (
                <DropdownMenuItem
                  key={field.id}
                  className="flex items-center gap-2 p-2"
                  onSelect={() => {
                    onSelect(field);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Icon className="size-4" />
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
