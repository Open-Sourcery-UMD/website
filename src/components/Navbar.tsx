'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MouseEvent, useEffect, useState } from 'react';
import { NavbarMobileMenu } from './NavbarMobileMenu';
import NavbarIcon from './NavbarIcon';

export const navigationItems = [
  { name: 'Home',
    color: 'white',
    link: '/' },
  { name: 'Projects',
    color: 'white',
    subItems: [
      { name: 'Start a project', link: '/project-proposal-form' },
      { name: 'Join a project', link: '/team-matching-portal'}
    ],
  },
  {
    name: 'Gems',
    color: 'green',
    link: '/gems',
  }
];

function Navbar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // The bar floats free over the hero and only takes on a surface once the
  // page has moved under it
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 800) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * On the home page the crest glides back to the top instead of re-navigating
   * to a route we're already on, which would jump there instantly.
   */
  const handleCrestClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== '/') return;

    event.preventDefault();
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <>
      <nav
        className={`fixed z-20 w-full flex flex-row items-center justify-between px-6 sm:px-8 text-graphite transition-all duration-500 ${
          isScrolled
            ? 'py-3 bg-white/70 backdrop-blur-xl border-b border-black/5 shadow-[0_8px_30px_-24px_rgba(31,32,51,0.5)]'
            : 'py-6 bg-transparent border-b border-transparent'
        }`}
      >
        <Link
          href="/"
          onClick={handleCrestClick}
          aria-label="Open Sourcery home"
          className="relative shrink-0 transition-transform duration-500 hover:scale-105"
        >
          {/* A faint sigil glow behind the mark */}
          <span className="absolute inset-0 -z-10 rounded-full bg-azure/20 blur-xl" />
          <Image
            src="/open_sourcery.png"
            alt="Open Sourcery Logo"
            width={isScrolled ? 52 : 68}
            height={isScrolled ? 52 : 68}
            className="transition-all duration-500"
          />
        </Link>
        {isMobile ? (
          <NavbarMobileMenu />
        ) : (
          <ul className="flex items-center gap-10 text-[0.95rem] tracking-wide">
            {navigationItems.map((item, index) => (
              <div
                key={index}
                className="relative group"
                onMouseEnter={() => item.subItems && setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.link ? item.link : ''}
                  // No vertical nudge here: .nav-link is position:relative, so
                  // an offset shifted the labels off the row's centre line and
                  // left the account icon looking misaligned
                  className={`nav-link px-2 ${item.link ? '' : 'pointer-events-none'}`}
                  target={!item.link?.startsWith('/') ? '_blank' : undefined}
                >
                  {item.name}
                </Link>
                {item.subItems && activeDropdown === item.name && (
                  // The padding is the hover bridge: with a plain margin the
                  // pointer crosses dead space on the way down and the menu
                  // closes before it can be clicked
                  <div className="absolute right-0 top-full z-50 w-48 pt-3">
                    <div className="surface rounded-xl py-2 animate-rise">
                      {item.subItems.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <Link
                            href={subItem.link}
                            className="block px-4 py-2 text-sm text-graphite-soft hover:text-graphite hover:bg-azure/5 transition-colors"
                          >
                            {subItem.name}
                          </Link>
                        </li>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <NavbarIcon />
          </ul>
        )}
      </nav>
      <div className="h-24" />
    </>
  );
}

export default Navbar;
