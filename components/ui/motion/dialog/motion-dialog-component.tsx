'use client';
import { Dialog, DialogTrigger, DialogContainer, DialogContent, DialogImage, DialogTitle, DialogSubtitle, DialogDescription, DialogClose } from '@/components/ui/motion/dialog/motion-dialog';
import { PlusIcon } from 'lucide-react';
import { BorderTrail } from '@/components/ui/motion/motion-border';
import Link from 'next/link';
import { StaticImageData } from 'next/image';
import { ScrollArea } from './scroll-area';
import { useRouter } from 'next/navigation';

const getImageSrc = (image: string | StaticImageData): string => {
  return typeof image === 'string' ? image : image.src;
};

interface DialogBasicOneProps {
  image: string | StaticImageData;
  title: string;
  imgdesc?: string | null;
  subtitle: string;
  description: string;
  block: string;
  link?: string | null;
  goTo?: string | null;
  examples?: string | null;
  exampleLink?: string | null;
  examples2?: string | null;
  exampleLink2?: string | null;
}

export function DialogBasicOne({
  image, imgdesc, title, subtitle, description, block, link, goTo, examples, exampleLink, examples2, exampleLink2
}: DialogBasicOneProps) {
  const router = useRouter();

  const handleClick = () => {
    if (link) {
      router.push(link);
    }
  };

  const handleExampleClick = () => {
    if (exampleLink) {
      window.open(exampleLink, '_blank');
    }
  };

  return (
    <Dialog
      transition={{
        type: 'spring',
        bounce: 0.05,
        duration: 0.45,
      }}
    >

      <DialogTrigger
        style={{
          borderRadius: '12px',
        }}
        className='flex max-w-lg w-full flex-col overflow-hidden border border-zinc-950/10 bg-white dark:border-zinc-50/10 dark:bg-zinc-900'
      >
        <BorderTrail
          style={{
            boxShadow:
              '0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)',
          }}
          size={280}
        />
        <DialogImage
          src={getImageSrc(image)}
          alt={imgdesc || ''}
          className='h-60 w-full object-cover'
        />
        <div className='flex flex-grow flex-row items-end justify-between p-3 tracking-wider'>
          <div>
            <DialogTitle className='text-zinc-950 dark:text-zinc-50 text-xl'>
              {title}
            </DialogTitle>
            <DialogSubtitle className='text-zinc-800 dark:text-zinc-400 tracking-wider text-base'>
              {subtitle}
            </DialogSubtitle>
          </div>
          <button
            type='button'
            className='relative ml-1 flex h-8 w-8 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg border border-zinc-950/10 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 active:scale-[0.98] dark:border-zinc-50/10 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-500'
            aria-label='Open dialog'
          >
            <PlusIcon size={16} />
          </button>
        </div>
      </DialogTrigger>

      <DialogContainer>
        <DialogContent
          style={{
            borderRadius: '24px',
          }}
          className='pointer-events-auto mx-4 relative flex h-auto w-full flex-col border border-zinc-950/10 bg-white dark:border-zinc-50/10 dark:bg-zinc-900 sm:w-[500px]'
        >
          <ScrollArea className='h-[90vh] sm:h-auto' type='scroll'>
            <div className='relative'>
              <div className='flex justify-center'>
                <DialogImage
                  src={getImageSrc(image)}
                  alt={imgdesc || ''}
                  className='h-60 sm:h-80 w-full'
                />
              </div>
              <div className='p-6 font-thin tracking-widest'>
                <DialogTitle className='text-zinc-950 dark:text-zinc-50 text-2xl'>
                  {title}
                </DialogTitle>
                <DialogSubtitle className='text-zinc-700 dark:text-zinc-300 tracking-widest text-base'>
                  {subtitle}
                </DialogSubtitle>
                <DialogDescription
                  disableLayoutAnimation
                  variants={{
                    initial: { opacity: 0, scale: 0.8, y: 100 },
                    animate: { opacity: 1, scale: 1, y: 0 },
                    exit: { opacity: 0, scale: 0.8, y: 100 },
                  }}
                  className='font-thin font-koh tracking-widest'
                >
                  <div className='mt-8 text-zinc-600 dark:text-zinc-300 text-lg'>
                    {description}
                  </div>
                  <br />
                  <div className='text-zinc-600 dark:text-zinc-300 text-lg'>
                    {block}
                  </div>
                  <br />
                  <div className='text-zinc-600 dark:text-zinc-300 text-lg'>
                    {examples && (
                      <div className='flex flex-row gap-2 items-center'>
                        <Link
                          className='mt-2 flex text-cyan-500 underline-offset-8'
                          href={exampleLink || ''}
                          rel='noopener noreferrer'
                          target='_blank' // Open link in a new tab
                          onClick={(e) => {
                            e.preventDefault(); // Prevent default link behavior
                            handleExampleClick(); // Call handleClick to toggle dialog
                          }}
                        >
                          {examples || ''}
                        </Link>
                      </div>
                    )}
                    {examples2 && (
                      <div className='flex flex-row gap-2 items-center'>
                        <Link
                          className='flex text-cyan-500 underline-offset-8'
                          href={exampleLink2 || ''}
                          rel='noopener noreferrer'
                          target='_blank' // Open link in a new tab
                          onClick={(e) => {
                            e.preventDefault(); // Prevent default link behavior
                            handleExampleClick(); // Call handleClick to toggle dialog
                          }}
                        >
                          {examples2 || ''}
                        </Link>
                      </div>
                    )}
                  </div>

                  <Link
                    className='mt-2 flex justify-end text-orange-400 font-medium underline underline-offset-8'
                    href={link || ''}
                    rel='noopener noreferrer'
                    onClick={(e) => {
                      e.preventDefault(); // Prevent default link behavior
                      handleClick(); // Call handleClick to toggle dialog
                    }}
                  >
                    {goTo || ''}
                  </Link>
                </DialogDescription>
              </div>
            </div>
            <DialogClose className='text-zinc-500' />
          </ScrollArea>
        </DialogContent>
      </DialogContainer >
    </Dialog >
  );
}
