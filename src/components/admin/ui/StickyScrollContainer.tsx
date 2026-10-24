"use client";

import React from "react";

interface StickyScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export default function StickyScrollContainer({
  children,
  className = "",
  innerClassName = "",
  ...props
}: StickyScrollContainerProps) {
  return (
    <div
      className={`w-full overflow-x-auto admin-scrollbar ${className} ${innerClassName}`}
      {...props}
    >
      {children}
    </div>
  );
}
