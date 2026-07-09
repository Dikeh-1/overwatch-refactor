import Image from "next/image";

type LogoProps = {
  className?: string;
  preload?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { width: 187, height: 28 },
  md: { width: 241, height: 36 },
  lg: { width: 294, height: 44 },
};

export default function Logo({
  className = "",
  preload = false,
  size = "md",
}: LogoProps) {
  const { width, height } = sizes[size];

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Overwatch Logo"
        width={width}
        height={height}
        className="w-auto h-auto object-contain dark:filter dark:brightness-0 dark:invert transition-all duration-300"
        preload={preload}
      />
    </div>
  );
}

