/**
 * The corner mark — whose app this is.
 *
 * It is the loudest piece of branding the product has: first in the reading
 * order, on screen for the whole session, and at 20px it is read as a logo
 * rather than an icon. `HanzoMark` is Hanzo's H, and one image serves every
 * brand, so it sat in the top-left of lux.chat both signed in and signed out.
 *
 * A brand's mark comes from the SAME directory as its favicon
 * (`assets/brand/<org>`, see `api/server/icons.js`) instead of a second set of
 * files. One brand, one place to put its marks; adding a brand stays "add a
 * directory" rather than "add a directory and a component".
 *
 * Hanzo keeps the shell's component rather than joining that scheme, and the
 * reason is behavioural, not sentimental: `HanzoMark` fills with `currentColor`,
 * which is what lets `BrandCorner` lift it to white on hover and lets the rail
 * cross-fade it against `PanelLeftOpen`. A raster mark cannot be tinted, so
 * routing Hanzo through the image path would quietly drop an interaction that
 * already works.
 *
 * A brand that ships no marks renders nothing — never another brand's logo,
 * which is the whole defect. The box keeps its size and stays clickable, and in
 * the rail the hover affordance is drawn by `NewChat`, not here, so the way back
 * into the sidebar survives a missing file.
 */
import { HanzoMark } from '@hanzogui/shell';
import { IAM_ORG } from '~/utils/iam';

export default function Mark({ size = 20 }: { size?: number }) {
  if (IAM_ORG === 'hanzo') {
    return <HanzoMark size={size} />;
  }
  return (
    <img
      src={`/assets/brand/${IAM_ORG}/apple-touch-icon-180x180.png`}
      width={size}
      height={size}
      alt=""
      /* The 180px mark scaled down, not the 32px favicon scaled up: the corner is
         drawn at 20 CSS px and lands on 40 device px on a retina display. */
      data-testid="mark"
    />
  );
}
