/** Page picker. `@hanzo/ui` owns the window of page numbers, the ellipses and
 * the prev/next affordances, so this is the component itself.
 *
 * It takes the whole question — `page`, `count`, `onChange` — rather than the
 * seven composable parts this file used to export. Those parts had no caller:
 * every pager in the app is hand-rolled, which is the duplication the one
 * component removes. */
export { Pagination } from '@hanzo/ui/product/Pagination';
export type { PaginationProps } from '@hanzo/ui/product/Pagination';
