/**
 * The build-time half of the app's gui config.
 *
 * `@hanzo/ui/gui-config` is the one config the app mounts at runtime (App.jsx).
 * The static extractor has to resolve themes and atomic styles against the SAME
 * object, so it reads it from here instead of owning a second copy — a config
 * the compiler sees and the runtime doesn't is how a page ends up styled with
 * rules nobody wrote.
 */
export { default } from '@hanzo/ui/gui-config';
