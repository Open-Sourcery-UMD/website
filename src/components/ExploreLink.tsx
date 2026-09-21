import Link from 'next/link';
import { GoArrowRight, GoArrowUpRight } from 'react-icons/go';

interface ExploreLinkProps {
  href: string;
  text?: string;
  className?: string;
}

export default function ExploreLink({
  href,
  text = 'Explore our projects',
  className = '',
}: ExploreLinkProps) {
  // Internal pages open in place with a forward arrow; the diagonal arrow and
  // a new tab are for leaving the site
  const isExternal = !href.startsWith('/');
  const Arrow = isExternal ? GoArrowUpRight : GoArrowRight;

  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`group mt-8 inline-flex items-center gap-3 text-lg text-azure hover:text-graphite transition-colors duration-300 cursor-pointer ${className}`}
    >
      <span className="relative">
        {text}
        {/* Underline grows from the left rather than snapping on */}
        <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-azure to-[#7b5cc4] transition-all duration-500 group-hover:w-full" />
      </span>
      <Arrow
        size={22}
        className={`transition-transform duration-500 group-hover:translate-x-1 ${
          isExternal ? 'group-hover:-translate-y-1' : ''
        }`}
      />
    </Link>
  );
}