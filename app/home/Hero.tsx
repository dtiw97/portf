"use client"

import { InView } from "@/components/ui/motion/motion-in-view";
import { motion } from "framer-motion";
import { TextScramble } from "@/components/ui/motion/motion-text-scramble";
import WordRotate from "@/components/ui/word-rotate";

const Hero = () => {
  return (
    <>
      <section className="flex flex-col justify-center">
        <TextScramble className="font-mono text-xl text-left font-extrabold mb-5 sm:mb-10">
          Welcome to David's Portfolio
        </TextScramble>


        <InView variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0 }
        }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 1.2, once: true }}

        >
          <div className="font-thin font-koh tracking-widest">
            I'm a frontend developer with a passion for not just beautiful designs, but lasting impressions.
          </div>
        </InView>
        <InView variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0 }
        }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 1.45, once: true }}
        >
          <div className="flex-1 flex flex-col sm:flex-row items-left sm:items-center gap-0 sm:gap-2 font-thin font-koh tracking-widest mt-4 sm:mt-0">
            I help business to
            <WordRotate
              duration={3000}
              className="bg-gradient-to-tr dark:from-blue-400 dark:to-[#bef264] from-blue-500 to-[#bef264] text-transparent bg-clip-text"
              words={['create awesome websites.', 'provide customer confidence.', 'form a sales channel.',]} />
          </div>

        </InView>
      </section>
      <InView variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
      }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 2, once: true }}
      >
        <section>
          <div className="font-mono text-xl text-left font-extrabold mt-5 pt-5 sm:pt-0 sm:mt-10 mb-2">
            Minimalist Principles
          </div>
          <div className="font-thin font-koh tracking-widest">
            Nothing is junk, everything has a purpose.
            <motion.div className="flex flex-col sm:flex-row sm:gap-2">
              Such as these
              {['shades', 'shades', 'shades', 'shades', 'shades', 'shades', 'shades', 'shades'].map((shade, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 2.7 + index * 0.2 }} // Staggering effect
                  className={`text-slate-${200 + index * 100}`}
                >
                  {shade}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </InView >
    </>
  )
}

export default Hero