import { ArrowDownIcon, ArrowUpIcon, CaretSortIcon, EyeNoneIcon } from '@radix-ui/react-icons';
import { Column } from '@tanstack/react-table';

import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { Button } from './Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className = '',
}: DataTableColumnHeaderProps<TData, TValue>) {
  const localize = useLocalize();
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-3 h-8 data-[state=open]:bg-accent">
            <span>{title}</span>
            {(() => {
              if (column.getIsSorted() === 'desc') {
                return <ArrowDownIcon className="ml-2 h-4 w-4" />;
              }
              if (column.getIsSorted() === 'asc') {
                return <ArrowUpIcon className="ml-2 h-4 w-4" />;
              }
              return <CaretSortIcon className="ml-2 h-4 w-4" />;
            })()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[1001]">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {localize('com_ui_asc')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {localize('com_ui_desc')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeNoneIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {localize('com_ui_hide')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
