/**
 * Chat's network + wallet cluster.
 *
 * DISABLED: the installed `@hanzo/ui` (5.x) no longer ships the `./network`
 * and `./wallet` subpath exports, so `import … from '@hanzo/ui/network'` /
 * `'@hanzo/ui/wallet'` is a hard `Missing specifier` error that fails the whole
 * Vite dep-scan and the production Rollup build (the identical landmine already
 * documented for hanzo/app's `components/network-wallet`). It renders `null`
 * until `@hanzo/ui` re-exports those entry points.
 *
 * Re-enable recipe (when `@hanzo/ui` exports `./network` + `./wallet` again):
 *
 *   import { NetworkSwitcher } from '@hanzo/ui/network';
 *   import { injectedEvmAdapter, WalletMenu } from '@hanzo/ui/wallet';
 *   const walletAdapter = injectedEvmAdapter();
 *   return (
 *     <div className="dark mr-1 hidden items-center gap-1.5 md:flex">
 *       <NetworkSwitcher />
 *       <WalletMenu adapter={walletAdapter} />
 *     </div>
 *   );
 */
export default function NetworkWallet() {
  return null;
}
