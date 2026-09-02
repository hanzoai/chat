/**
 * WHICH product this is. One table, and it is the only one.
 *
 * One image serves every brand — hanzo.chat, lux.chat and zoolabs.io are the
 * same bytes — so none of this may be compiled in. A build-time variable pins
 * the deployment to whichever brand happened to build the image, and the second
 * brand then sends its visitors to the FIRST brand's issuer carrying a
 * `redirect_uri` that issuer has never heard of. An issuer cannot redirect
 * somewhere it does not trust, so it renders an error page and the product is
 * unreachable while the server stays perfectly healthy.
 *
 * The HOST answers instead, against this table. Deriving the answer from the
 * host is not enough, and `zoolabs.io` is why: the label left of the suffix is
 * `zoolabs`, the organization is `zoo`, and the issuer is neither — so a rule
 * clever enough to read one brand quietly mints `zoolabs-chat` against
 * `https://zoolabs.id` for an organization that does not exist. Every brand
 * states its own facts and the hosts it answers on, and a new brand is a new
 * record and nothing else.
 *
 * Everything a brand can differ by is HERE. Split across two homes it gets
 * half-applied: the product's name used to be `config.appTitle` from the server
 * OR a hard-coded 'Hanzo Chat' beside every read of it, and since that route
 * answers nothing, every brand called itself Hanzo Chat.
 */

export type Brand = {
  /** IAM organization, lowercase. The OAuth client is `<org>-chat`. */
  org: string
  /** IAM origin, e.g. `https://hanzo.id`. */
  issuer: string
  /** The issuer's name, for the screen whose whole job is to say where you go. */
  name: string
  /** The product's name: the tab, the rail, the greeting. */
  title: string
  /** The mark, as an SVG data URI. What a tab shows when it is not focused. */
  mark: string
  /** What the document paints before anybody has stated a preference. */
  backdrop: 'dark' | 'light'
  /**
   * The immersive ground the shell floats on, as any CSS `background` value —
   * a gradient (self-contained, so it paints offline and in the desktop
   * webview) or a `url()` a brand would rather show. The glass chrome blurs
   * over THIS, which is why it is a brand fact and not a component default:
   * each brand owns the world its product sits in.
   */
  scene: string
  /** The line under the composer. Empty means the brand wants none. */
  footer: string
  /** The hosts this brand answers on. */
  hosts: readonly string[]
  /**
   * The brand's `pk-` key, for asking without signing in.
   *
   * Optional, and unset on purpose: `createAiClient` at the pinned 0.6.7 takes
   * `auth`, `token` and `getToken` and nothing else, so there is nowhere to put
   * one yet. Declared here because the anonymous baseline is a BRAND fact — each
   * org mints its own — and a field added later beside the issuer is a field two
   * brands can already disagree about. `ai.ts` starts reading it when the SDK
   * takes it.
   */
  publishableKey?: string
}

/**
 * A mark, in the one frame they all share: a black rounded square with the
 * brand's glyph on it. The frame is written once so three marks cannot drift
 * into three different corner radii.
 */
const mark = (glyph: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="8" fill="#000"/>${glyph}</svg>`,
  )}`

const HANZO = mark(
  '<g transform="translate(8,8) scale(0.716)" fill="#fff">' +
    '<path d="M22.21 67V44.6369H0V67H22.21Z"/>' +
    '<path d="M66.7038 22.3184H22.2534L0.0878906 44.6367H44.4634L66.7038 22.3184Z"/>' +
    '<path d="M22.21 0H0V22.3184H22.21V0Z"/>' +
    '<path d="M66.7198 0H44.5098V22.3184H66.7198V0Z"/>' +
    '<path d="M66.7198 67V44.6369H44.5098V67H66.7198Z"/>' +
    '</g>',
)

const LUX = mark('<path d="M32 52 12 18h40Z" fill="#fff"/>')

/**
 * Zoo's three-circle additive Venn, scaled from the 1024 master into the 64
 * frame: the primaries, then each pair clipped to its overlap, then the centre
 * where all three meet. The overlaps are painted rather than blended because a
 * blend mode is a rendering hint an icon decoder is free to ignore.
 */
const ZOO = mark(
  '<defs>' +
    '<clipPath id="o"><circle cx="32.58" cy="32.53" r="24"/></clipPath>' +
    '<clipPath id="g"><circle cx="32.58" cy="20" r="20.64"/></clipPath>' +
    '<clipPath id="r"><circle cx="19.52" cy="40.16" r="20.64"/></clipPath>' +
    '</defs>' +
    '<g clip-path="url(#o)">' +
    '<circle cx="32.58" cy="20" r="20.64" fill="#00A652"/>' +
    '<circle cx="19.52" cy="40.16" r="20.64" fill="#ED1C24"/>' +
    '<circle cx="45.63" cy="40.16" r="20.64" fill="#2E3192"/>' +
    '<g clip-path="url(#g)">' +
    '<circle cx="19.52" cy="40.16" r="20.64" fill="#FCF006"/>' +
    '<circle cx="45.63" cy="40.16" r="20.64" fill="#01ACF1"/>' +
    '</g>' +
    '<g clip-path="url(#r)"><circle cx="45.63" cy="40.16" r="20.64" fill="#EA018E"/></g>' +
    '<g clip-path="url(#g)"><g clip-path="url(#r)">' +
    '<circle cx="45.63" cy="40.16" r="20.64" fill="#fff"/>' +
    '</g></g>' +
    '</g>',
)

/** Every brand this image serves. To add one, add a record. */
export const brands: readonly Brand[] = [
  {
    org: 'hanzo',
    issuer: 'https://hanzo.id',
    name: 'Hanzo',
    title: 'Hanzo Chat',
    mark: HANZO,
    backdrop: 'dark',
    scene: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.15), rgba(255, 255, 255, 0))',
    footer: '',
    hosts: ['hanzo.chat', 'chat.hanzo.ai'],
    // Free AI without signing in: this org-scoped `pk-` names the tenant, so an
    // anonymous visitor asks on the projected free/anonymous policy (data-shared,
    // rate-limited). A signed-in user's token layers on through `auth`.
    publishableKey: 'pk-G7yTL-sSl6i9zGR_0s1qtGH8pf6tGKzosExH7ZzXSSg',
  },
  {
    org: 'lux',
    issuer: 'https://lux.id',
    name: 'Lux',
    title: 'Lux Chat',
    mark: LUX,
    backdrop: 'dark',
    scene: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 175, 55, 0.15), rgba(255, 255, 255, 0))',
    footer: '',
    hosts: ['lux.chat', 'chat.lux.network'],
  },
  {
    org: 'zoo',
    issuer: 'https://zoolabs.id',
    name: 'Zoo',
    title: 'Zoo Chat',
    mark: ZOO,
    backdrop: 'dark',
    scene: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34, 197, 94, 0.15), rgba(255, 255, 255, 0))',
    footer: '',
    hosts: ['zoolabs.io', 'chat.zoo.ngo'],
  },
]

declare global {
  interface Window {
    /**
     * What a deployment states when the host is not enough — injected into the
     * served document by the static plane. The same escape hatch the issuer
     * addresses had, one level of indirection shorter.
     */
    __brand?: Partial<Brand>
  }
}

const host = typeof window === 'undefined' ? '' : window.location.hostname

/** Hanzo is first, so an unknown host and a development one are both Hanzo's. */
const served = brands.find((one) => one.hosts.includes(host)) ?? brands[0]

export const brand: Brand = {
  ...served,
  ...(typeof window === 'undefined' ? {} : window.__brand),
}

/** The OAuth client: `<org>-<app>`, the estate's rule, spelled once. */
export const clientId = `${brand.org}-chat`

/**
 * Put the brand on the document.
 *
 * The served HTML is the same bytes for every brand, so the title and the icon
 * it arrives with are placeholders; this is the moment they become true. Called
 * from the mount, before React paints, so no brand is ever seen wearing
 * another's name.
 */
export const wear = () => {
  document.title = brand.title
  document.documentElement.dataset.theme = brand.backdrop

  const found = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  const icon = found ?? document.createElement('link')
  icon.rel = 'icon'
  icon.type = 'image/svg+xml'
  icon.href = brand.mark
  if (!found) document.head.appendChild(icon)
}
