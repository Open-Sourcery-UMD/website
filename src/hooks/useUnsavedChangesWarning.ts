'use client';

import { useEffect } from 'react';

export const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Leave this page without saving them?';

/**
 * Asks for confirmation before the user leaves the page with unsaved changes.
 *
 * Covers closing or reloading the tab (via the browser's own prompt, whose
 * wording browsers control) and clicks on links elsewhere in the app, such as
 * the navbar. Browser back and forward can't be intercepted without rewriting
 * history, so they aren't covered.
 */
export function useUnsavedChangesWarning(
  enabled: boolean,
  message: string = UNSAVED_CHANGES_MESSAGE
) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Browsers show their own wording; this is only what triggers it
      event.preventDefault();
      event.returnValue = '';
    };

    const handleClick = (event: MouseEvent) => {
      // Leave modified clicks alone - they open a new tab or window, so this
      // page isn't going anywhere
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = (event.target as HTMLElement | null)?.closest?.('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || link.target === '_blank') return;

      const destination = new URL(link.href, window.location.href);

      // mailto: and external links either don't navigate this page or are
      // already covered by the beforeunload prompt above
      if (destination.origin !== window.location.origin) return;

      // Jumping around the same page isn't leaving it
      if (destination.pathname === window.location.pathname) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        // Capture phase: stop it before the router ever sees the click
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [enabled, message]);
}
