import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  variant?: "default" | "white";
  className?: string;
  as?: "h1" | "h2" | "h3";
};

export default function SectionHeader({
  label,
  title,
  description,
  align = "center",
  variant = "default",
  className,
  as: Component = "h2",
}: SectionHeaderProps) {
  const textColor = variant === "white" ? "text-white" : "text-foreground";
  const mutedTextColor = variant === "white" ? "text-white/88" : "text-muted";
  const accentTextColor = variant === "white" ? "text-accent" : "text-accent";

  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "text-center mx-auto max-w-3xl",
        textColor,
        className,
      )}
    >
      {label && (
        <span className={cn("inline-block text-sm font-semibold tracking-widest uppercase mb-3", accentTextColor)}>
          {label}
        </span>
      )}
      <Component className={cn("text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4", textColor)}>
        {title}
      </Component>
      {description && (
        <p className={cn("text-lg md:text-xl leading-relaxed whitespace-pre-line", mutedTextColor)}>
          {description}
        </p>
      )}
    </div>
  );
}
