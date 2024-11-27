import Link from 'next/link'
import { useTranslations } from 'next-intl';

export const Header = () => {
  const t = useTranslations('Layout');
  return (
    <div className="flex gap-5 items-center font-mono font-semibold">
      <Link href={"/"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
        {t('home')}
      </Link>
      <Link href={"/contact"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
        {t('contact')}
      </Link>
      <Link href={"/pricing"} className="hover:scale-105 text-neutral-300 hover:text-emerald-400 transition-all duration-450">
        {t('pricing')}  
      </Link>

    </div>
  )
}
