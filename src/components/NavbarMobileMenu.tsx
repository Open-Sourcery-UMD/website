'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { navigationItems } from './Navbar';
import NavbarIcon from './NavbarIcon';

export const NavbarMobileMenu = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

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
        className="text-white text-3xl pr-2 pt-[0.47rem]"
      >
        <div className="space-y-2">
          <span className="block w-8 h-0.5 bg-white"></span>
          <span className="block w-8 h-0.5 bg-white"></span>
          <span className="block w-8 h-0.5 bg-white"></span>
        </div>
      </button>

      {/* Slide-in Menu */}
      <div
        ref={menuRef}
        className={`fixed top-0 right-0 h-full bg-ycs-pink shadow-md transition-transform duration-500 w-3/4 rounded-bl-[5rem] rounded-tl-[5rem] flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={toggleMobileMenu}
          className="py-2 px-6 text-6xl font-extralight self-end"
        >
          ×
        </button>

        <ul className="flex flex-col text-3xl p-14 gap-6">
          {navigationItems.map((item, index) => (
            <li key={index} className="flex flex-col">
              {/* Parent Item */}
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className="text-left nav-link"
                  >
                    {item.name}
                  </button>

                  {/* Sub Items */}
                  {activeDropdown === item.name && (
                    <ul className="flex flex-col pl-6 mt-2 gap-2 text-xl">
                      {item.subItems.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <Link
                            href={subItem.link}
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              setActiveDropdown(null);
                            }}
                            className="block py-1 hover:underline"
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
                  className="nav-link"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}

          {/* Navbar Icon (mobile version) */}
          <li className="pt-6">
            <NavbarIcon />
          </li>
        </ul>
      </div>
    </div>
  );
};
