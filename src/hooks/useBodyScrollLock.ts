'use client';

import { useEffect } from 'react';

/**
 * Holds the page still while a modal is open.
 *
 * `overflow: hidden` on its own isn't enough on mobile: touches that land
 * outside the dialog, or that carry on past the end of its own scrolling,
 * still move the page behind it. Fixing the body stops that everywhere, at
 * the cost of having to put the scroll position back afterwards - fixing it
 * otherwise jumps the page to the top.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      Object.assign(body.style, previous);
      // Back to where they were, without the smooth scrolling the site sets
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [locked]);
}
