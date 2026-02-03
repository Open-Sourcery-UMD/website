import Link from 'next/link';
import { FC } from 'react';

interface Props {
  title: string;
  text: string;
  color: 'pink' | 'blue' | 'green' | 'faded-pink' | 'red';
  link?: string;
  label?: string;
  icon?: React.ReactNode;
}

export const GradientBox: FC<Props> = ({ title, text, color, link, label, icon }) => {
  let gradientColors;
  let hoverGradient;
  let borderColor;
  let iconBg;
  let buttonBg;

  switch (color) {
    case 'pink':
      gradientColors = 'from-ycs-old-pink/20 to-transparent';
      hoverGradient = 'hover:from-ycs-old-pink/30';
      borderColor = 'border-ycs-old-pink';
      iconBg = 'bg-ycs-old-pink/20';
      buttonBg = 'bg-ycs-old-pink';
      break;
    case 'faded-pink':
      gradientColors = 'from-ycs-faded-pink/20 to-transparent';
      hoverGradient = 'hover:from-ycs-faded-pink/30';
      borderColor = 'border-ycs-faded-pink';
      iconBg = 'bg-ycs-faded-pink/20';
      buttonBg = 'bg-ycs-faded-pink';
      break;
    case 'blue':
      gradientColors = 'from-ycs-blue/20 to-transparent';
      hoverGradient = 'hover:from-ycs-blue/30';
      borderColor = 'border-ycs-blue';
      iconBg = 'bg-ycs-blue/20';
      buttonBg = 'bg-ycs-blue';
      break;
    case 'green':
      gradientColors = 'from-ycs-green/20 to-transparent';
      hoverGradient = 'hover:from-ycs-green/30';
      borderColor = 'border-ycs-green';
      iconBg = 'bg-ycs-green/20';
      buttonBg = 'bg-ycs-green';
      break;
    case 'red':
      gradientColors = 'from-ycs-security-red/20 to-transparent';
      hoverGradient = 'hover:from-ycs-security-red/30';
      borderColor = 'border-ycs-security-red';
      iconBg = 'bg-ycs-security-red/20';
      buttonBg = 'bg-ycs-security-red';
      break;
    default:
      gradientColors = 'from-ycs-pink/20 to-transparent';
      hoverGradient = 'hover:from-ycs-pink/30';
      borderColor = 'border-ycs-pink';
      iconBg = 'bg-ycs-pink/20';
      buttonBg = 'bg-ycs-pink';
  }

  const content = (
    <div
      className={`w-full text-left bg-zinc-800/50 bg-gradient-to-br ${gradientColors} ${hoverGradient} 
      border-l-4 ${borderColor} rounded-2xl p-8 transition-all duration-300 
      hover:shadow-lg hover:translate-y-[-4px] relative h-full`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center mb-4">
          {icon && <div className={`p-3 rounded-lg ${iconBg} mr-4 text-white`}>{icon}</div>}
          <h3 className="text-white text-2xl font-bold">{title}</h3>
        </div>

        <p className="text-zinc-300 text-base lg:text-lg mb-6 flex-grow">{text}</p>

        {link && label && 
          <Link
            href={link}
            className={`flex self-center justify-center align-center py-3 px-8 rounded-xl text-center cursor-pointer ${buttonBg} bg-opacity-40 hover:bg-opacity-70 transition-colors duration-300`}
          >
            <p className="m-auto">
              {label}
            </p>
          </Link>
        }
      </div>
    </div>
  );

  return content;
};
