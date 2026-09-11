import Image from "next/image";

type LogoProps = {
  className?: string;
  preload?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "auto";
};

const sizes = {
  sm: { width: 187, height: 28 },
  md: { width: 241, height: 36 },
  lg: { width: 294, height: 44 },
};

const sizeClasses = {
  sm: "w-[187px]",
  md: "w-[241px]",
  lg: "w-[294px]",
};

export default function Logo({
  className = "",
  preload = false,
  size = "md",
  variant = "auto",
}: LogoProps) {
  const { width, height } = sizes[size];

  const variantClass =
    variant === "light"
      ? "brightness-0 invert"
      : variant === "dark"
        ? ""
        : "dark:brightness-0 dark:invert";

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Overwatch"
        width={width}
        height={height}
        className={`${sizeClasses[size]} h-auto max-w-full object-contain transition-all duration-300 ${variantClass}`}
        preload={preload}
      />
    </div>
  );
}
