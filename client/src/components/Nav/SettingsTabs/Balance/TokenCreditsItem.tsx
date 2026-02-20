import React from 'react';
import { Label, InfoHoverCard, ESide } from '@librechat/client';
import { useLocalize } from '~/hooks';

interface TokenCreditsItemProps {
  tokenCredits?: number;
  expiresAt?: Date;
}

/**
 * Convert tokenCredits to USD string.
 * 1,000,000 tokenCredits = $1 USD.
 */
function creditsToUsd(credits: number): string {
  return (credits / 1000000).toFixed(2);
}

const LOW_BALANCE_THRESHOLD = 2000000; // $2 USD in tokenCredits

const TokenCreditsItem: React.FC<TokenCreditsItemProps> = ({ tokenCredits, expiresAt }) => {
  const localize = useLocalize();
  const credits = tokenCredits ?? 0;
  const usdBalance = creditsToUsd(credits);
  const isLowBalance = credits > 0 && credits < LOW_BALANCE_THRESHOLD;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        {/* Left Section: Label */}
        <div className="flex items-center space-x-2">
          <Label className="font-light">{localize('com_nav_balance')}</Label>
          <InfoHoverCard side={ESide.Bottom} text={localize('com_nav_info_balance')} />
        </div>

        {/* Right Section: USD Value */}
        <span
          className={`text-sm font-medium ${
            isExpired || credits === 0
              ? 'text-red-600 dark:text-red-400'
              : isLowBalance
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-800 dark:text-gray-200'
          }`}
          role="note"
        >
          ${usdBalance} USD
        </span>
      </div>

      {/* Low balance warning */}
      {isLowBalance && !isExpired && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400">
          Low balance.{' '}
          <a
            href="https://hanzo.ai/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Add funds
          </a>
        </div>
      )}

      {/* Expired credits warning */}
      {isExpired && (
        <div className="text-xs text-red-600 dark:text-red-400">
          Credits expired.{' '}
          <a
            href="https://hanzo.ai/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Add funds
          </a>
        </div>
      )}

      {/* Expiry date display */}
      {expiresAt && !isExpired && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Credits expire {new Date(expiresAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default TokenCreditsItem;
