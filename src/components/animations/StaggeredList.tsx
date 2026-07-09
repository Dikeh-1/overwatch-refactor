"use client";

import { motion } from "framer-motion";
import { ReactNode, Children, isValidElement } from "react";

interface StaggeredListProps {
  children: ReactNode;
  className?: string;
  delayOffset?: number;
  staggerDuration?: number;
}

export default function StaggeredList({ 
  children, 
  className = "", 
  delayOffset = 0,
  staggerDuration = 0.1 
}: StaggeredListProps) {
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delayOffset,
        staggerChildren: staggerDuration,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number]
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={className}
    >
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          // Wrapping each child in a motion.div to apply stagger effects automatically
          return (
            <motion.div variants={itemVariants}>
              {child}
            </motion.div>
          );
        }
        return child;
      })}
    </motion.div>
  );
}
