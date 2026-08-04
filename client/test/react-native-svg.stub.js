/**
 * jsdom stand-in for `react-native-svg`.
 *
 * WHY THIS EXISTS — it is not a convenience, it routes around a packaging bug.
 * `@hanzogui/lucide-icons-2@8.0.0` imports `react-native-svg` from the very file
 * its own `browser` export condition points at, while declaring it in neither
 * `dependencies` nor `peerDependencies`. Every `@hanzo/ui` 8.x primitive that
 * shows an icon (Checkbox's tick, Select's chevron, …) drags it in.
 *
 * In a browser bundle vite resolves that to the package's `.web.js` siblings and
 * it works. Under jest it does not: `react-native-svg`'s `react-native` field
 * points at `src/index.ts`, so jest walks into raw TypeScript inside
 * node_modules and then into `react-native/Libraries/Utilities/
 * codegenNativeComponent.js` — Flow-typed source babel-jest cannot parse. The
 * failure surfaces as a SyntaxError blamed on the test's own import line.
 *
 * jsdom renders real SVG elements, and no unit test here asserts on SVG
 * internals — they assert on labels, roles and handlers. So the honest fix for
 * the TEST environment is to render plain SVG DOM and let the component under
 * test be what is exercised. Delete this the day lucide-icons-2 stops importing
 * a native-only module from its browser build.
 */
const React = require('react');

/** react-native-svg passes RN-flavoured props; SVG DOM wants the dashed names. */
const el =
  (tag) =>
  ({ children, ...props }) =>
    React.createElement(tag, props, children);

const Svg = ({ children, width, height, ...props }) =>
  React.createElement('svg', { width, height, ...props }, children);

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Circle: el('circle'),
  Ellipse: el('ellipse'),
  G: el('g'),
  Text: el('text'),
  TSpan: el('tspan'),
  TextPath: el('textPath'),
  Path: el('path'),
  Polygon: el('polygon'),
  Polyline: el('polyline'),
  Line: el('line'),
  Rect: el('rect'),
  Use: el('use'),
  Image: el('image'),
  Symbol: el('symbol'),
  Defs: el('defs'),
  LinearGradient: el('linearGradient'),
  RadialGradient: el('radialGradient'),
  Stop: el('stop'),
  ClipPath: el('clipPath'),
  Pattern: el('pattern'),
  Mask: el('mask'),
  Marker: el('marker'),
  ForeignObject: el('foreignObject'),
};
