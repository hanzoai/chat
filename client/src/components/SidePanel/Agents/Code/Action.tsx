import { AgentCapabilities } from '@hanzochat/data-provider';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import {
  Checkbox,
  HoverCard,
  CircleHelpIcon,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
} from '@hanzochat/client';
import type { AgentForm } from '~/common';
import { useLocalize } from '~/hooks';
import { ESide } from '~/common';
import { cn } from '~/utils';

/**
 * The agent builder's "Run code" capability.
 *
 * It is a plain checkbox now. It used to be a checkbox plus a key button plus a
 * dialog, and a third state where an unchecked box opened the dialog instead of
 * checking itself — all of that existed to collect a per-user code-interpreter
 * API key. A sandbox runs under the signed-in user's own IAM bearer, so there is
 * no key, and `isToolAuthenticated` is now true for every signed-in caller.
 */
export default function Action({ isToolAuthenticated = false }) {
  const localize = useLocalize();
  const methods = useFormContext<AgentForm>();
  const { control, setValue } = methods;

  const runCodeIsEnabled = useWatch({ control, name: AgentCapabilities.execute_code });

  const handleCheckboxChange = (checked: boolean) => {
    setValue(AgentCapabilities.execute_code, checked, { shouldDirty: true });
  };

  return (
    <>
      <HoverCard openDelay={50}>
        <div className="flex items-center">
          <Controller
            name={AgentCapabilities.execute_code}
            control={control}
            render={({ field }) => (
              <Checkbox
                {...field}
                id="execute-code-checkbox"
                checked={runCodeIsEnabled ? runCodeIsEnabled : isToolAuthenticated && field.value}
                onCheckedChange={handleCheckboxChange}
                className="relative float-left mr-2 inline-flex h-4 w-4 cursor-pointer"
                value={field.value.toString()}
                disabled={runCodeIsEnabled ? false : !isToolAuthenticated}
                aria-labelledby="execute-code-label"
              />
            )}
          />
          <label
            id="execute-code-label"
            htmlFor="execute-code-checkbox"
            className={cn(
              'form-check-label text-token-text-primary',
              (runCodeIsEnabled || isToolAuthenticated) && 'cursor-pointer',
            )}
          >
            {localize('com_ui_run_code')}
          </label>
          <div className="ml-2 flex gap-2">
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center"
                aria-label={localize('com_agents_code_interpreter')}
              >
                <CircleHelpIcon className="h-4 w-4 text-text-tertiary" />
              </button>
            </HoverCardTrigger>
          </div>
          <HoverCardPortal>
            <HoverCardContent side={ESide.Top} className="w-80">
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  {localize('com_agents_code_interpreter')}
                </p>
              </div>
            </HoverCardContent>
          </HoverCardPortal>
        </div>
      </HoverCard>
    </>
  );
}
