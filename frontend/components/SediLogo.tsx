interface SediLogoProps {
  size?: number;
  className?: string;
}

/**
 * sed.i logo — an imperfect solid circle with organic, hand-drawn wobble.
 * Uses currentColor so it inherits text color across all themes.
 */
export default function SediLogo({ size = 40, className = "" }: SediLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M52,3 C71,0 86,11 93,26 C101,42 98,58 92,71 C84,86 70,97 53,98 C37,99 22,92 13,79 C4,66 0,49 5,34 C10,18 26,5 42,2 C46,1 49,2 52,3Z"
        fill="currentColor"
      />
    </svg>
  );
}
