import React, { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import type { Dispatch, SetStateAction } from 'react';
import { PanelLeft } from 'lucide-react';
import { HanzoMark } from '@hanzogui/shell';
import { useLocalize, useAuthContext, useSignupUrl } from '~/hooks';
import { startHanzoLogin } from '~/utils/login';
import { TemporaryChat } from '~/components/Chat/TemporaryChat';
import store from '~/store';

/**
 * The phone's top bar — kept to what a thumb needs, nothing else.
 *
 * Left is ONE control: the Hanzo H, the glyph everyone reads, which swaps to the
 * sidebar-expand mark (`PanelLeft`) on hover/focus and opens the drawer on tap.
 * It replaces the old hamburger-beside-the-mark pair — two affordances in the
 * corner for one idea. New chat, search and history live one tap inside that
 * drawer. Both glyphs stack in one 20px box, so the swap moves no pixel.
 *
 * Right is ONE control too: temporary ("incognito") chat. Everything that used
 * to crowd the phone's top — the desktop header's new chat, bookmarks, share,
 * canvas and window chrome — is desktop-only now (see Chat/Header), so the phone
 * reads as the composer in focus rather than a title bar.
 *
 * Signed out there is no conversation to title, so the right is the two ways in.
 */

export default function MobileNav({
  setNavVisible,
  navVisible,
}: {
  navVisible: boolean;
  setNavVisible: Dispatch<SetStateAction<boolean>>;
}) {
  const localize = useLocalize();
  const signup = useSignupUrl();
  const { isAuthenticated } = useAuthContext();
  const conversation = useAtomValue(store.conversationByIndex(0));
  const { title = 'New Chat' } = conversation || {};

  const toggleNav = useCallback(() => setNavVisible((prev) => !prev), [setNavVisible]);

  const menuLabel = navVisible
    ? localize('com_nav_close_sidebar')
    : localize('com_nav_open_sidebar');

  return (
    <div className="sticky top-0 z-10 flex min-h-[40px] items-center justify-between pl-1 pt-[env(safe-area-inset-top)] dark:text-white md:hidden">
      <button
        type="button"
        data-testid="mobile-menu-button"
        aria-label={menuLabel}
        aria-live="polite"
        aria-expanded={navVisible}
        aria-controls="chat-history-nav"
        onClick={toggleNav}
        className="group relative m-1 inline-flex size-11 items-center justify-center rounded-full text-text-secondary hover:bg-surface-active-alt"
      >
        <span className="transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
          <HanzoMark size={20} />
        </span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          <PanelLeft size={20} aria-hidden="true" />
        </span>
      </button>

      {isAuthenticated ? (
        <>
          {/* A label for the open conversation, not the page subject — the
              composer prompt is the h1. Heading-shaped chrome here would both
              duplicate it and land ahead of it in reading order. */}
          <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-center text-sm font-normal">
            {title ?? localize('com_ui_new_chat')}
          </div>
          {/* Top-right: temporary ("incognito") chat, the one control the phone
              keeps up here. TemporaryChat renders null when the feature is off,
              which leaves the right edge cleanly empty. */}
          <div className="flex items-center pr-1">
            <TemporaryChat />
          </div>
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
            href={signup}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-text-secondary hover:text-text-primary"
          >
            {localize('com_auth_sign_up')}
          </a>
        </div>
      )}
    </div>
  );
}
