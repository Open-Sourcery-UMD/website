'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { HiOutlineCog, HiOutlineUser } from 'react-icons/hi';
import { useAuth } from '@context/AuthContext';
import { navigationItems } from './Navbar';

const ACCOUNT_ITEMS = [
  { name: 'Sign Up', link: '/sign-up' },
  { name: 'Log In', link: '/log-in' },
];

export const NavbarMobileMenu = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { firebaseUser, loading } = useAuth();

  const menuRef = useRef<HTMLDivElement | null>(null);

  // The drawer is portalled to the body, which can only happen once mounted
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Every link in the drawer closes it on the way out
  const closeMenu = () => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsMobileMenuOpen(false);
      setActiveDropdown(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      {/* Hamburger */}
      <button
        onClick={toggleMobileMenu}
        aria-label="Open menu"
        aria-expanded={isMobileMenuOpen}
        className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] text-graphite"
      >
        <span className="block h-[2px] w-6 rounded-full bg-graphite" />
        <span className="block h-[2px] w-6 rounded-full bg-graphite" />
        <span className="block h-[2px] w-6 rounded-full bg-graphite" />
      </button>

      {/*
        Portalled to the body on purpose. The navbar carries a backdrop-filter,
        which makes it the containing block for fixed descendants - left in
        place, the drawer's h-full resolved to the navbar's height and
        collapsed to a sliver with its contents spilling out.
      */}
      {isMounted &&
        createPortal(
          <div
            ref={menuRef}
            className={`surface fixed top-0 right-0 z-50 flex h-full w-[min(20rem,82vw)] flex-col rounded-l-3xl transition-transform duration-500 ${
              isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Close Button */}
            <button
              onClick={toggleMobileMenu}
              aria-label="Close menu"
              className="self-end px-6 py-5 text-3xl font-light leading-none text-graphite-soft transition-colors hover:text-graphite"
            >
              &times;
            </button>

            <ul className="flex flex-col gap-6 px-10 pb-10 pt-2 text-xl">
              {navigationItems.map((item, index) => (
                <li key={index} className="flex flex-col">
                  {/* Parent Item */}
                  {item.subItems ? (
                    <>
                      <button
                        onClick={() => toggleDropdown(item.name)}
                        aria-expanded={activeDropdown === item.name}
                        className="text-left text-graphite transition-colors hover:text-azure"
                      >
                        {item.name}
                      </button>

                      {/* Sub Items */}
                      {activeDropdown === item.name && (
                        <ul className="mt-3 flex flex-col gap-2 border-l border-black/10 pl-4 text-base">
                          {item.subItems.map((subItem, subIndex) => (
                            <li key={subIndex}>
                              <Link
                                href={subItem.link}
                                onClick={closeMenu}
                                className="block py-1 text-graphite-soft transition-colors hover:text-azure"
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.link || '/'}
                      onClick={closeMenu}
                      className="text-graphite transition-colors hover:text-azure"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}

              {/*
                Account, laid out like the other items rather than reusing the
                desktop icon and its hover menu: signed out it expands Sign Up
                and Log In in place, like Projects does
              */}
              {!loading && (
                <li className="mt-2 flex flex-col border-t border-black/10 pt-6">
                  {firebaseUser ? (
                    <Link
                      href="/settings"
                      onClick={closeMenu}
                      className="flex items-center gap-2 text-graphite transition-colors hover:text-azure"
                    >
                      <HiOutlineCog size={22} aria-hidden />
                      Settings
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleDropdown('account')}
                        aria-expanded={activeDropdown === 'account'}
                        className="flex items-center gap-2 text-left text-graphite transition-colors hover:text-azure"
                      >
                        <HiOutlineUser size={22} aria-hidden />
                        Account
                      </button>

                      {activeDropdown === 'account' && (
                        <ul className="mt-3 flex flex-col gap-2 border-l border-black/10 pl-4 text-base">
                          {ACCOUNT_ITEMS.map((accountItem) => (
                            <li key={accountItem.link}>
                              <Link
                                href={accountItem.link}
                                onClick={closeMenu}
                                className="block py-1 text-graphite-soft transition-colors hover:text-azure"
                              >
                                {accountItem.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};
