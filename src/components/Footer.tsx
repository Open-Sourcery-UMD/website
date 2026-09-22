import Link from 'next/link';
import { cloneElement } from 'react';
import { FaDiscord, FaGithub, FaInstagram, FaLinkedinIn, FaRegEnvelope } from 'react-icons/fa';

interface FooterIconProps {
  link: string;
  ariaLabel: string;
  icon: React.ReactElement;
  /** The brand fill that floods in behind the glyph on hover */
  fill: string;
}

const FooterIcon: React.FC<FooterIconProps> = (props: FooterIconProps) => {
  const resizedIcon = cloneElement(props.icon, { size: 18 });

  return (
    <Link
      href={props.link}
      className="surface group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-graphite-soft transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
      aria-label={props.ariaLabel}
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* Splashes out from the centre rather than just switching colour */}
      <span
        aria-hidden
        className="absolute inset-0 scale-0 rounded-full opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100"
        style={{ background: props.fill }}
      />
      <span className="relative">{resizedIcon}</span>
    </Link>
  );
};

// Each service's own colours: a manila-envelope brown for mail, Discord's
// blurple, GitHub's near-black, Instagram's corner-lit gradient and
// LinkedIn's blue
const FILLS = {
  email: 'linear-gradient(135deg, #b3855a 0%, #7a5433 100%)',
  discord: 'linear-gradient(135deg, #7984f5 0%, #5865f2 100%)',
  github: 'linear-gradient(135deg, #3a4149 0%, #0d1117 100%)',
  instagram:
    'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)',
  linkedin: 'linear-gradient(135deg, #2a86e0 0%, #0a66c2 100%)',
};

interface Props {
  className?: string;
}

export const Footer = ({ className }: Props) => {
  return (
    <footer className={`relative z-20 mt-24 ${className ?? ''}`}>
      <div className="mx-auto max-w-7xl px-6 sm:px-12">
        {/* A seam to close the page, matching the one under the hero */}
        <div className="rule-gradient" />

        <div className="flex flex-col items-center gap-5 py-12">
          <span className="eyebrow">Get in touch</span>

          <div className="flex justify-center gap-3">
            <FooterIcon
              link="mailto:umdopensourcery@gmail.com"
              ariaLabel="Email"
              fill={FILLS.email}
              icon={<FaRegEnvelope />}
            />
            <FooterIcon
              link="https://discord.com/invite/BWvbpgskZT"
              ariaLabel="Discord"
              fill={FILLS.discord}
              icon={<FaDiscord />}
            />
            <FooterIcon
              link="https://github.com/open-sourcery-umd"
              ariaLabel="Github"
              fill={FILLS.github}
              icon={<FaGithub />}
            />
            <FooterIcon
              link="https://www.instagram.com/umdopensourcery/"
              ariaLabel="Instagram"
              fill={FILLS.instagram}
              icon={<FaInstagram />}
            />
            <FooterIcon
              link="https://www.linkedin.com/company/Open-Sourcery-UMD/"
              ariaLabel="LinkedIn"
              fill={FILLS.linkedin}
              icon={<FaLinkedinIn />}
            />
          </div>

          <p className="text-sm text-graphite-mute">
            Open Sourcery &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
};
