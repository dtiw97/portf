import Link from 'next/link'
import { useTranslations } from 'next-intl';

export const Footer = () => {
  const t = useTranslations('Layout');
  return (
    <div className="flex flex-row items-end justify-end w-full gap-5 pr-2">
      <Link href={"/contact"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
        {t('contact')}
      </Link>
      <Link href={"/pricing"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
        {t('pricing')}
      </Link>
    </div>
  )
}
