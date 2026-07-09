"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FAQItem = {
  question: string;
  answer: string;
};

export default function FAQAccordion({ limit }: { limit?: number }) {
  const t = useTranslations("faq");
  const allItems = t.raw("items") as FAQItem[];
  const items = limit ? allItems.slice(0, limit) : allItems;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-0 divide-y divide-border/50">
      {items.map((item, index) => (
        <div
          key={item.question}
          className="group overflow-hidden"
        >
          <button
            type="button"
            className="w-full flex items-center justify-between gap-4 py-5 md:py-6 text-left transition-colors hover:text-accent"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            aria-expanded={openIndex === index}
          >
            <span className="font-semibold text-foreground pr-4">{item.question}</span>
            <ChevronDown
              size={20}
              className={cn(
                "text-accent shrink-0 transition-transform duration-300",
                openIndex === index && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="pb-5 md:pb-6 text-muted leading-relaxed">
                  {item.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
