import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // The raised pushbutton, and the ONE loud thing a surface is allowed.
        // It was `bg-primary`, which in both themes resolves to near-white — so
        // every unnamed Button, and the primary action of every dialog, painted
        // a white slab on a near-black page. `--surface-submit` is dark in both
        // themes, so its label is light in both and needs no branch.
        default:
          'border border-surface-submit-hover bg-surface-submit text-white hover:bg-surface-submit-hover',
        destructive:
          'bg-surface-destructive text-destructive-foreground hover:bg-surface-destructive-hover',
        outline:
          'text-text-primary border border-border-light bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-surface-hover hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // The primary CTA IS the default look — one raised pushbutton, spelled
        // once. `submit` stays as a name because it says which action is the
        // primary one, and that is worth reading at the call site.
        submit:
          'border border-surface-submit-hover bg-surface-submit text-white hover:bg-surface-submit-hover',
      },
      // 44px is the pointer-target floor: the box grows, the glyph inside does not.
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-lg px-8',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
