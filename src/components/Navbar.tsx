'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
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
  const [isMobile, setIsMobile] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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

  return (
    <>
      <div className="gradient-shadow fixed w-full h-24 z-20"></div>
      <nav className="flex flex-row items-center justify-between bg-black text-white p-8 w-full fixed z-20">
        <Link href="/" className="font-extrabold pl-2 text-3xl">
          <Image src="/open_sourcery.png" alt="Open Sourcery Logo" width={80} height={80} />
        </Link>
        {isMobile ? (
          <NavbarMobileMenu />
        ) : (
          <ul className="flex gap-12 text-lg">
            {navigationItems.map((item, index) => (
              <div
                key={index}
                className="relative group"
                onMouseEnter={() => item.subItems && setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.link ? item.link : ''}
                  className={`nav-link transform duration-100 px-2 pb-2 top-[6px] text-${item.color} ${item.link ? '' : 'pointer-events-none'}`}
                  target={!item.link?.startsWith('/') ? '_blank' : undefined}
                >
                  {item.name}
                </Link>
                {item.subItems && activeDropdown === item.name && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg z-50 py-2">
                    {item.subItems.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <Link
                          href={subItem.link}
                          className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors"
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    ))}
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
