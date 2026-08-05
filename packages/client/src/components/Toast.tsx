import * as RadixToast from '@radix-ui/react-toast';
import { NotificationSeverity } from '~/common';
import { useToast } from '~/hooks';

export function Toast() {
  const { toast, onOpenChange } = useToast();
  const severityClassName = {
    /* A toast is floating chrome, so it is made of the same material as every
     * other floating surface and says which kind it is with a LEFT EDGE rather
     * than by flooding the whole panel with a hue. These four were the only
     * saturated fills left in the product — a green, an orange and a red slab
     * that arrived over a monochrome page — and severity survives the change
     * because the edge still carries it.
     *
     * Only the error keeps a colour, because red is the one signal a reader must
     * not have to parse text to notice; it is `--border-destructive`, the token
     * the rest of the app already refuses in. */
    [NotificationSeverity.INFO]: 'glass elevation-2 border-l-4 border-l-border-heavy',
    [NotificationSeverity.SUCCESS]: 'glass elevation-2 border-l-4 border-l-text-primary',
    [NotificationSeverity.WARNING]: 'glass elevation-2 border-l-4 border-l-text-secondary',
    [NotificationSeverity.ERROR]: 'glass elevation-2 border-l-4 border-l-border-destructive',
  };

  return (
    <RadixToast.Root
      open={toast.open}
      onOpenChange={onOpenChange}
      className="toast-root"
      style={{
        height: '74px',
        marginBottom: '0px',
      }}
    >
      <div className="w-full p-1 text-center md:w-auto md:text-justify">
        <div
          className={`alert-root pointer-events-auto inline-flex flex-row gap-2 rounded-md border border-border-medium px-3 py-2 font-medium text-text-primary ${
            severityClassName[toast.severity]
          }`}
        >
          {toast.showIcon && (
            <div className="mt-1 flex-shrink-0 flex-grow-0">
              <svg
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon-sm"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          )}
          <RadixToast.Description className="flex-1 justify-center gap-2">
            <div className="whitespace-pre-wrap text-left">{toast.message}</div>
          </RadixToast.Description>
        </div>
      </div>
    </RadixToast.Root>
  );
}
