interface Props {
  title: string;
  subtitle: string;
  eyebrow?: string;
  className?: string;
}

export const TitleSubtitle: React.FC<Props> = ({
  title,
  subtitle,
  eyebrow,
  className,
}: Props) => {
  return (
    <div className={`flex flex-col items-center mx-auto max-w-3xl ${className}`}>
      {eyebrow && (
        <span className="eyebrow eyebrow-center mb-5">{eyebrow}</span>
      )}
      <h2 className="text-graphite text-3xl sm:text-5xl lg:text-6xl font-semibold text-center leading-[1.05]">
        {title}
      </h2>
      <p className="text-graphite-soft text-lg lg:text-xl mt-5 text-center text-balance leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
};
