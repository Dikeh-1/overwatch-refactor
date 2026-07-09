"use client";

import { IMAGES } from "@/lib/constants";
import LazyVideo from "@/components/ui/LazyVideo";

export default function VideoShowcase() {
  return (
    <section className="hidden md:block py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-xl p-px bg-gradient-to-b from-accent/30 to-transparent">
          <div className="relative rounded-xl overflow-hidden bg-primary-darker aspect-video">
            <LazyVideo
              className="w-full h-auto block"
              poster={IMAGES.videoPoster}
              rootMargin="700px"
              src={IMAGES.videoSrc}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
