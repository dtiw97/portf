"use client"

import { InView } from "@/components/ui/motion/motion-in-view";
import { motion } from "framer-motion";
import { TextScramble } from "@/components/ui/motion/motion-text-scramble";
import WordRotate from "@/components/ui/word-rotate";
import { Spotlight } from "@/components/ui/ace/spotlight/ace-spotlight";

const Hero = () => {
  return (
    // <div className="h-3/4 min-h-screen-2/3 text-2xl">
    <div className=" text-2xl">
      {/* <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-1/3"
        fill="cyan"
      /> */}
      <section className="flex flex-col justify-center">
        <TextScramble className="font-mono text-4xl text-left font-extrabold mb-5 sm:mb-5 text-foreground" characterSet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789">
          welcome to david's portfolio
        </TextScramble>

        <InView variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0 }
        }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 0.25, once: true }}

        >
          <div className="font-thin tracking-widest">
            I'm a <span className="text-black dark:text-stone-300 font-extralight">frontend developer</span> with a passion for <span className="text-black dark:text-stone-300 font-extralight">not just beautiful designs, but lasting impressions.</span>
          </div>
        </InView>
        <InView variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0 }
        }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 0.25, once: true }}
        >
          <div className="flex-1 text-black dark:text-stone-200 flex flex-col sm:flex-row items-left sm:items-center gap-0 sm:gap-2 font-extralight font-koh tracking-widest mt-4 sm:mt-0">
            I help business to
            <WordRotate
              duration={3000}
              className="bg-gradient-to-tr font-extralight dark:from-blue-400 dark:to-[#bef264] from-blue-500 to-[#bef264] text-transparent bg-clip-text"
              words={['create awesome websites.', 'provide customer confidence.', 'form a sales channel.',]} />
          </div>

        </InView>
      </section>
      <InView variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
      }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.35, once: true }}
      >
        <section>
          <div className="font-mono text-3xl text-left font-extrabold mt-5 pt-5 sm:pt-0 sm:mt-10 mb-2 text-foreground">
            minimalist principles
          </div>
          <div className="font-thin font-koh tracking-widest">
            Nothing is junk, everything has a purpose.
            <div className="flex flex-col sm:flex-row">
              <div className="min-w-48">Such as these</div>
              <motion.div className="flex flex-col sm:flex-row sm:gap-2">
                <motion.div className="text-stone-900 dark:text-stone-200" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.15 }}>shades</motion.div>
                <motion.div className="text-stone-800 dark:text-stone-300" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.25 }}>shades</motion.div>
                <motion.div className="text-stone-700 dark:text-stone-400" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.35 }}>shades</motion.div>
                <motion.div className="text-stone-600 dark:text-stone-500" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.45 }}>shades</motion.div>
                <motion.div className="text-stone-500 dark:text-stone-600" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.55 }}>shades</motion.div>
                <motion.div className="text-stone-400 dark:text-stone-700" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.65 }}>shades</motion.div>
                <motion.div className="text-stone-300 dark:text-stone-800" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.75 }}>shades</motion.div>
                <motion.div className="text-stone-200 dark:text-stone-900" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.85 }}>shades</motion.div>
              </motion.div>
            </div>
          </div>
        </section>
      </InView >
    </div>
  )
}

export default Hero