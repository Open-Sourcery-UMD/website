'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { navigationItems } from './Navbar';
import NavbarIcon from './NavbarIcon';

export const NavbarMobileMenu = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // The drawer is portalled to the body, which can only happen once mounted
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
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
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  setActiveDropdown(null);
                                }}
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
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-graphite transition-colors hover:text-azure"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}

              {/* Navbar Icon (mobile version) */}
              <li className="mt-2 border-t border-black/10 pt-6">
                <NavbarIcon />
              </li>
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};
