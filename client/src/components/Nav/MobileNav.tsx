import React, { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { QueryKeys } from '@hanzochat/data-provider';
import { useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useLocalize, useNewConvo, useAuthContext } from '~/hooks';
import { startHanzoLogin } from '~/utils/login';
import { IAM_SIGNUP_URL } from '~/utils/iam';
import { clearMessagesCache } from '~/utils';
import BrandCorner from './BrandCorner';
import store from '~/store';

/**
 * The phone's top bar, and on this width the owner of the app's top-left corner.
 *
 * Two controls anchor the left in BOTH auth states, because they mean the same
 * thing in both: the menu button opens the drawer (chats, settings, help, the
 * account or the offer), and the mark IS the app switcher — the same
 * `BrandCorner` that owns the corner on desktop, one tap from anywhere. The mark
 * used to double as the drawer toggle when signed out, which left the switcher
 * reachable only through the drawer and gave the one glyph everybody reads as
 * "Hanzo" a meaning it has nowhere else.
 *
 * Signed in, the middle is the open conversation's title and the right is
 * compose. Signed out there is no conversation to title, so the right is the two
 * ways in.
 */

const TAP = 'm-1 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-active-alt';

export default function MobileNav({
  setNavVisible,
  navVisible,
}: {
  navVisible: boolean;
  setNavVisible: Dispatch<SetStateAction<boolean>>;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const { isAuthenticated } = useAuthContext();
  const conversation = useAtomValue(store.conversationByIndex(0));
  const { title = 'New Chat' } = conversation || {};

  const toggleNav = useCallback(() => setNavVisible((prev) => !prev), [setNavVisible]);

  const menuLabel = navVisible
    ? localize('com_nav_close_sidebar')
    : localize('com_nav_open_sidebar');

  return (
    <div className="sticky top-0 z-10 flex min-h-[40px] items-center justify-between bg-presentation pl-1 pt-[env(safe-area-inset-top)] dark:text-white md:hidden">
      <div className="flex items-center">
        <button
          type="button"
          data-testid="mobile-menu-button"
          aria-label={menuLabel}
          aria-live="polite"
          aria-expanded={navVisible}
          aria-controls="chat-history-nav"
          className={TAP}
          onClick={toggleNav}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="icon-md"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3 8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8C21 8.55228 20.5523 9 20 9H4C3.44772 9 3 8.55228 3 8ZM3 16C3 15.4477 3.44772 15 4 15H14C14.5523 15 15 15.4477 15 16C15 16.5523 14.5523 17 14 17H4C3.44772 17 3 16.5523 3 16Z"
              fill="currentColor"
            />
          </svg>
        </button>
        <BrandCorner />
      </div>

      {isAuthenticated ? (
        <>
          {/* A label for the open conversation, not the page subject — the composer
              prompt is the h1. Heading-shaped chrome here would both duplicate it and
              land ahead of it in reading order. */}
          <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-sm font-normal">
            {title ?? localize('com_ui_new_chat')}
          </div>
          <button
            type="button"
            aria-label={localize('com_ui_new_chat')}
            className={TAP}
            onClick={() => {
              clearMessagesCache(queryClient, conversation?.conversationId);
              queryClient.invalidateQueries([QueryKeys.messages]);
              newConversation();
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="icon-md"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.7929 2.79289C18.0118 1.57394 19.9882 1.57394 21.2071 2.79289C22.4261 4.01184 22.4261 5.98815 21.2071 7.20711L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.29289 11.2929L16.7929 2.79289ZM19.7929 4.20711C19.355 3.7692 18.645 3.7692 18.2071 4.2071L10 12.4142V14H11.5858L19.7929 5.79289C20.2308 5.35499 20.2308 4.64501 19.7929 4.20711ZM6 5C5.44772 5 5 5.44771 5 6V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V14C19 13.4477 19.4477 13 20 13C20.5523 13 21 13.4477 21 14V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34314 4.34315 3 6 3H10C10.5523 3 11 3.44771 11 4C11 4.55228 10.5523 5 10 5H6Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-1 pr-1">
          <button
            type="button"
            onClick={startHanzoLogin}
            className="inline-flex min-h-11 items-center rounded-full border border-surface-submit-hover bg-surface-submit px-3.5 text-sm font-medium text-white hover:bg-surface-submit-hover"
          >
            {localize('com_nav_log_in')}
          </button>
          <a
            href={IAM_SIGNUP_URL}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-text-secondary hover:text-text-primary"
          >
            {localize('com_auth_sign_up')}
          </a>
        </div>
      )}
    </div>
  );
}
