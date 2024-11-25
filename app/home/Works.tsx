import { DialogBasicOne } from '@/components/ui/motion/dialog/motion-dialog-component';
import { InView } from '@/components/ui/motion/motion-in-view';
import { BorderTrail } from '@/components/ui/motion/motion-border';
import next from '@/lib/images/nextjs.png';
import framer from '@/lib/images/framer.png';

const Works = () => {
  return (
    <div>
      <InView variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
      }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.5, once: true }}
      >
        <section className='text-3xl'>
          <div className="font-mono text-left font-extrabold mt-5 pt-5 sm:pt-0 sm:mt-10 text-foreground">
            design approach
          </div>

          <div className="text-left font-extralight font-koh tracking-widest mt-3 text-xl text-stone-600 italic">
            Cores
          </div>
          <div className="text-left font-thin font-koh tracking-widest border-b pb-5 text-lg flex flex-col gap-1 sm:gap-0">
            {/* point 1 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              Lightning Loading
              <div className='text-base font-thin'>
                retaining attention & interest
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-green-600 font-light dark:font-thin to-gray-400 dark:to-green-200'>
                  after 1.3s
                </span>
              </div>
            </div>
            {/* point 2 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              Responsive Pages
              <div className='text-base font-thin'>
                mobile 90%, desktops 10%;
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-green-600 font-light dark:font-thin to-gray-400 dark:to-green-200'>
                  100% impressive
                </span>
              </div>
            </div>
          </div>

          <div className='h-5 sm:h-0' />

          <div className="text-left font-extralight font-koh tracking-widest mt-3 text-xl text-stone-600 italic">
            Techniques
          </div>
          <div className="text-left font-thin font-koh tracking-widest border-b pb-5 text-lg flex flex-col gap-1 sm:gap-0">
            {/* point 1 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              Attention flow
              <div className='text-base font-thin'>
                sequence your readers to
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-cyan-600 font-light dark:font-thin to-gray-400 dark:to-cyan-200'>
                  convince themselves
                </span>
              </div>
            </div>
            {/* point 2 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              Visual Hierarchy
              <div className='text-base font-thin'>
                you'll read this later.
                <span className='ml-1 bg-clip-text text-transparent bg-gradient-to-br from-cyan-600 font-light dark:font-thin to-gray-400 dark:to-cyan-200'>
                  Gotcha.
                </span>
              </div>
            </div>
          </div>

          <div className='h-5 sm:h-0' />

          <div className="text-left font-extralight font-koh tracking-widest mt-3 text-xl text-stone-600 italic">
            Deliveries
          </div>
          <div className="text-left font-thin font-koh tracking-widest pb-5 text-lg flex flex-col gap-1 sm:gap-0">
            {/* point 1 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              Unique Selling Point (USP)
              <div className='text-base font-thin'>
                know what sells and
                <span className='ml-1 font-mono font-bold bg-clip-text text-transparent bg-gradient-to-br from-orange-600  dark:font-thin to-gray-400 dark:to-yellow-400'>
                  EMPHASIZE
                </span>
              </div>
            </div>
            {/* point 2 */}
            <div className='flex flex-col sm:flex-row justify-between text-black font-light dark:text-stone-200 sm:items-center'>
              Interaction Cues
              <div className='text-base font-thin'>
                make yourself
                <span className='ml-1 bg-clip-text font-medium text-transparent bg-gradient-to-br from-orange-600 dark:font-thin to-gray-400 dark:to-yellow-400'>
                  approachable
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className='text-3xl'>
          <div className="font-mono text-left font-extrabold mt-5 pt-5 sm:pt-0 sm:mt-10 text-foreground">
            works
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
                title="Webpage Development"
                subtitle="Simple Pages"
                link="/pricing"
                goTo="Go to /pricing"
                description="Webpages are crafted to deliver clear, visually appealing content."
                block="Perfect for portfolios, landing pages, & showcasing your brand. Create an impactful first impression & captivate your audience effortlessly."
              />
            </div>

            <DialogBasicOne
              image={next}
              title="Web Application Development"
              subtitle="Powering Business"
              link="/contact"
              goTo="Get quote"
              description="Beyond static pages, offering interactive & dynamic solutions tailored to your needs."
              block="Streamline business processes, boost engagement, & deliver seamless user experiences with custom web apps."
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