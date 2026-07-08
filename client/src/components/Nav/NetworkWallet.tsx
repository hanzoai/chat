/**
 * Chat's network + wallet cluster — the shared @hanzo/ui pair over the
 * web custody model (injected EIP-1193, non-custodial). ONE adapter
 * instance for the surface; selection persists in the shared network
 * store so every consumer of `getNetwork()` follows the switcher.
 *
 * Wrapped in `dark` because the HanzoHeader bar is always monochrome
 * dark, independent of the app theme.
 */
import React from 'react';
import { NetworkSwitcher } from '@hanzo/ui/network';
import { injectedEvmAdapter, WalletMenu } from '@hanzo/ui/wallet';

const walletAdapter = injectedEvmAdapter();

export default function NetworkWallet() {
  return (
    <div className="dark mr-1 hidden items-center gap-1.5 md:flex">
      <NetworkSwitcher />
      <WalletMenu adapter={walletAdapter} />
    </div>
  );
}
