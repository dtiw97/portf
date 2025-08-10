import { DialogBasicOne } from '@/components/ui/motion/dialog/motion-dialog-component';
import { InView } from '@/components/ui/motion/motion-in-view';
import { BorderTrail } from '@/components/ui/motion/motion-border';
import next from '@/lib/images/nextjs.png';
import framer from '@/lib/images/framer.png';
import { useTranslations } from 'next-intl';

const Works = () => {
  const t = useTranslations('Works');
  return (
    <div>
      <InView variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
      }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.5 }}
        viewOptions={{ once: true }}
      >
        <section className='text-3xl'>
          <div className="font-mono text-left font-extrabold mt-5 pt-5 sm:pt-0 sm:mt-10 text-foreground">
            {t('design')}
          </div>

          <div className="text-left font-extralight font-koh tracking-widest mt-3 text-xl text-stone-600 italic">
            {t('cores')}
          </div>
          <div className="text-left font-thin font-koh tracking-widest border-b pb-5 text-lg flex flex-col gap-1 sm:gap-0">
            {/* point 1 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              {t('lightning')}
              <div className='text-base font-thin'>
                {t('retaining')} & {t('interest')}
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-green-600 font-light dark:font-thin to-gray-400 dark:to-green-200'>
                  {t('after')} 1.3s
                </span>
              </div>
            </div>
            {/* point 2 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              {t('responsive')}
              <div className='text-base font-thin'>
                {t('mobile')} 90%, {t('desktop')} 10%;
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-green-600 font-light dark:font-thin to-gray-400 dark:to-green-200'>
                  100% {t('impressive')}
                </span>
              </div>
            </div>
          </div>

          <div className='h-5 sm:h-0' />

          <div className="text-left font-extralight font-koh tracking-widest mt-3 text-xl text-stone-600 italic">
            {t('techniques')}
          </div>
          <div className="text-left font-thin font-koh tracking-widest border-b pb-5 text-lg flex flex-col gap-1 sm:gap-0">
            {/* point 1 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              {t('attention')}
              <div className='text-base font-thin'>
                {t('sequence')}
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-cyan-600 font-light dark:font-thin to-gray-400 dark:to-cyan-200'>
                  {t('themselves')}
                </span>
              </div>
            </div>
            {/* point 2 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              {t('visual')}
              <div className='text-base text-foreground/20 font-thin'>
                {t('later')}
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-cyan-600 font-light dark:font-thin to-gray-400 dark:to-cyan-200'>
                  {t('gotcha')}
                </span>
              </div>
            </div>
          </div>

          <div className='h-5 sm:h-0' />

          <div className="text-left font-extralight font-koh tracking-widest mt-3 text-xl text-stone-600 italic">
            {t('deliveries')}
          </div>
          <div className="text-left font-thin font-koh tracking-widest pb-5 text-lg flex flex-col gap-1 sm:gap-0">
            {/* point 1 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              {t('usp')}
              <div className='text-base font-thin'>
                {t('know')}
                <span className='ml-1 font-mono font-bold bg-clip-text text-transparent bg-gradient-to-br from-orange-600  dark:font-thin to-gray-400 dark:to-yellow-400'>
                  {t('emphasize')}
                </span>
              </div>
            </div>
            {/* point 2 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              {t('interaction')}
              <div className='text-base font-thin'>
                {t('yourself')}
                <span className='ml-1 bg-clip-text font-medium text-transparent bg-gradient-to-br from-orange-600 dark:font-thin to-gray-400 dark:to-yellow-400'>
                  {t('approachable')}
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className='text-3xl'>
          <div className="font-mono text-left font-extrabold mt-5 pt-5 sm:pt-0 sm:mt-10 text-foreground">
            {t('works')}
          </div>
          <div className="text-left font-thin text-black dark:text-stone-300 font-koh tracking-widest mb-5 text-xl">
            {/* Build online presence with Webpage; <br />
            Build business with Web Application. */}
          </div>
          <div className="relative p-1 rounded-xl flex flex-col sm:flex-row justify-between font-thin gap-4 font-koh tracking-widest">
            <div className='relative w-full rounded-xl p-1'>
              {/* <BorderTrail
                style={{
                  boxShadow:
                    '0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)',
                }}
                size={280}
              /> */}
              <DialogBasicOne
                image={framer}
                title={t('webpage')}
                subtitle={t('simple')}
                link="/pricing"
                goTo={t('goTo')}
                description={t('description')}
                block={t('block')}
                examples={t('examples')}
                exampleLink="https://noru.framer.website/"
                examples2={t('examples2')}
                exampleLink2="https://aiman-pt.framer.website/"
              />
            </div>

            <DialogBasicOne
              image={next}
              title={t('application')}
              subtitle={t('powering')}
              link="/contact"
              goTo={t('quote')}
              description={t('description2')}
              block={t('block2')}
            />

          </div>
          {/* <div className='relative h-[200px] w-[300px] flex items-center justify-center rounded-md bg-zinc-200 px-5 py-2 dark:bg-zinc-900'>
            <BorderTrail
              style={{
                boxShadow:
                  '0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)',
              }}
              size={100}
            />
          </div> */}
        </section>
      </InView>
    </div >
  )
}

export default Works;