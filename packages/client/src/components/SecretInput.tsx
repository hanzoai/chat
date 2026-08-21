/** A secret you can check, copy, and not leak over someone's shoulder.
 * `@hanzo/ui` owns the masking, the reveal and the copy-while-masked, so this
 * is the component itself.
 *
 * It is CONTROLLED — `value` plus `onChange(next)` — where this file used to
 * export an uncontrolled DOM input. A react-hook-form caller reaches it through
 * `<Controller>` rather than `register()`. */
export { SecretInput } from '@hanzo/ui/product/SecretInput';
export type { SecretInputProps } from '@hanzo/ui/product/SecretInput';
