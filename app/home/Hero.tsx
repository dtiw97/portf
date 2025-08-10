"use client"

import { InView } from "@/components/ui/motion/motion-in-view";
import { motion } from "framer-motion";
import { TextScramble } from "@/components/ui/motion/motion-text-scramble";
import WordRotate from "@/components/ui/word-rotate";
import { useTranslations } from "next-intl";

const Hero = () => {
  const t = useTranslations('Hero');
  return (

    <div className="text-2xl">

      <section className="flex flex-col justify-center">
        <TextScramble className="font-mono text-4xl text-left font-extrabold mb-5 sm:mb-5 text-foreground" characterSet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789">
          {t('title')}
        </TextScramble>

        <InView variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0 }
        }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 0.25 }}
          viewOptions={{ once: true }}

        >
          <div className="font-thin tracking-widest">
            {t('intro')}
            <span className="text-black dark:text-stone-300 font-extralight">
              {t('frontend')}
            </span>
            {t('passion')}
            <span className="text-black dark:text-stone-300 font-extralight">
              {t('impressions')}
            </span>
          </div>
        </InView>
        <InView variants={{
          hidden: { opacity: 0, y: 15 },
          visible: { opacity: 1, y: 0 }
        }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 0.25 }}
          viewOptions={{ once: true }}
        >
          <div className="flex-1 text-black dark:text-stone-200 flex flex-col sm:flex-row items-left sm:items-center gap-0 sm:gap-2 font-extralight font-koh tracking-widest mt-4 sm:mt-0">
            {t('help')}
            <WordRotate
              duration={3000}
              className="bg-gradient-to-tr font-extralight dark:from-blue-400 dark:to-[#bef264] from-blue-500 to-[#bef264] text-transparent bg-clip-text"
              words={
                [t('create'), t('provide'), t('form')]
              } />
          </div>

        </InView>
      </section>
      <InView variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
      }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.35 }}
        viewOptions={{ once: true }}
      >
        <section>
          <div className="font-mono text-3xl text-left font-extrabold mt-5 pt-5 sm:pt-0 sm:mt-10 mb-2 text-foreground">
            {t('principles')}
          </div>
          <div className="font-thin font-koh tracking-widest">
            {t('nothing')}
            <div className="flex flex-col sm:flex-row">
              <div className="min-w-48 w-fit">{t('such')}</div>
              <motion.div className="flex flex-col sm:flex-row sm:gap-2">
                <motion.div className="text-stone-900 dark:text-stone-200" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.15 }}>
                  {t('shades')}
                </motion.div>
                <motion.div className="text-stone-800 dark:text-stone-300" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.25 }}>
                  {t('shades')}
                </motion.div>
                <motion.div className="text-stone-700 dark:text-stone-400" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.35 }}>
                  {t('shades')}
                </motion.div>
                <motion.div className="text-stone-600 dark:text-stone-500" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.45 }}>
                  {t('shades')}
                </motion.div>
                <motion.div className="text-stone-500 dark:text-stone-600" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.55 }}>
                  {t('shades')}
                </motion.div>
                <motion.div className="text-stone-400 dark:text-stone-700" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.65 }}>
                  {t('shades')}
                </motion.div>
                <motion.div className="text-stone-300 dark:text-stone-800" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.75 }}>
                  {t('shades')}
                </motion.div>
                <motion.div className="text-stone-200 dark:text-stone-900" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeInOut", delay: 1.85 }}>
                  {t('shades')}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>
      </InView >
    </div>
  )
}

export default Hero