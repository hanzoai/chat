import { memo } from 'react';

/**
 * What stands in for the action strip while a reply is still streaming.
 *
 * `md:hidden` because from `md` up SubRow is out of flow and reserves nothing.
 * A placeholder that kept its height there would drop the reply by its own
 * height the moment streaming ended and the strip replaced it.
 */
const PlaceholderRow = memo(() => {
  return <div className="mt-1 h-[27px] bg-transparent md:hidden" />;
});

export default PlaceholderRow;
