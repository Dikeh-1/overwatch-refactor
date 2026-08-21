"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link as NextIntlLink } from "@/i18n/navigation";

type ButtonProps = {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  external?: boolean;
};

const variants = {
  primary:
    "bg-accent text-primary-dark font-semibold hover:brightness-105 active:brightness-95",
  secondary:
    "border border-accent/50 text-accent hover:bg-accent/10 hover:border-accent",
  ghost: "text-muted hover:text-accent hover:bg-accent/5",
};

const sizes = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-12 px-6 py-3 text-base",
  lg: "min-h-14 px-7 py-3.5 text-base sm:px-8 sm:text-lg",
};

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function useMagnet(strength = 0.1) {
  const ref = useRef<HTMLElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    setStyle({
      transform: `translate(${x * strength}px, ${y * strength}px)`,
      transition: "transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)",
    });
  };

  const onMouseLeave = () => {
    setStyle({
      transform: "translate(0px, 0px)",
      transition: "transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)",
    });
  };

  return { ref, style, onMouseMove, onMouseLeave };
}

const MotionLink = motion.create(NextIntlLink);

export default function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  disabled,
  onClick,
  external,
}: ButtonProps) {
  const {
    ref: magnetRef,
    style: magnetStyle,
    onMouseMove,
    onMouseLeave,
  } = useMagnet();

  const classes = cn(
    "inline-flex max-w-full touch-manipulation items-center justify-center rounded-lg text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark disabled:cursor-not-allowed disabled:opacity-50 select-none",
    variants[variant],
    sizes[size],
    className
  );

  const motionProps = {
    whileTap: { scale: 0.95 },
  };

  if (href) {
    if (external || isExternalHref(href)) {
      return (
        <motion.a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          ref={magnetRef as React.RefObject<HTMLAnchorElement>}
          style={magnetStyle}
          onClick={() => onClick?.()}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          {...motionProps}
        >
          {children}
        </motion.a>
      );
    }

    return (
      <MotionLink
        href={href}
        className={classes}
        ref={magnetRef as React.RefObject<HTMLAnchorElement>}
        style={magnetStyle}
        onClick={() => onClick?.()}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        {...motionProps}
      >
        {children}
      </MotionLink>
    );
  }

  return (
    <motion.button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      ref={magnetRef as React.RefObject<HTMLButtonElement>}
      style={magnetStyle}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
}
