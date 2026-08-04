import * as React from 'react';
import { Label as GuiLabel } from '@hanzo/ui/primitives/Label';
import { cn } from '~/utils';

type LabelProps = React.ComponentProps<typeof GuiLabel>;

/** Form-control caption. gui paints the size, weight and colour, so the old
 * wrapper's `text-sm leading-none dark:text-gray-200` is gone. What stays is the
 * layout half: chat's labels are full-width block captions that must break long
 * unspaced strings (tool names, memory keys, model ids). */
const Label = ({ className, ...props }: LabelProps) => (
  <GuiLabel {...props} className={cn('block w-full break-all', className)} />
);

export { Label };
