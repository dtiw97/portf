'use client';
import React from 'react'
import Link from 'next/link'
import { Mail, MessageCircleMore } from 'lucide-react'
import { useTranslations } from 'next-intl';
export const runtime = 'edge';

const Pricing = () => {
  const t = useTranslations('PricingPage');
  // Add contact details
  const emailAddress = "david.tiw.minjie@gmail.com"
  const whatsappNumber = "125552420"

  const date = new Date().toLocaleString();

  const pricingPlans = [
    {
      title: t('free'),
      price: "RM0",
      description: t('description'),
      features: [
        t('consultation'),
        t('scope'),
        t('features'),
        t('deliverables'),
        // t('nothing'),
        t('next')
      ],
      buttonText: t('dontClick'),
      href: `https://wa.me/${whatsappNumber}?text=${date}%20Hi%21%20I%27m%20interested%20in%20Web%20Page%20Development%20services%21`, // Placeholder link
    },
    {
      title: t('webpage'),
      price: "RM1750",
      description: t('description2'),
      features: [
        t('custom'),
        t('responsive'),
        t('seo'),
        t('analytics'),
        t('support'),
        t('domain')
      ],
      buttonText: t('getStarted'),
      popular: true,
      href: `https://wa.me/${whatsappNumber}?text=${date}%20Hi%21%20I%27m%20interested%20in%20Web%20Page%20Development%20services%21`,

    },
    {
      title: t('webapp'),
      price: t('customPrice'),
      description: t('description3'),
      features: [
        t('scalable'),
        t('api'),
        t('authentication'),
        t('realTime'),
        t('mobile'),
        t('testing')
      ],
      buttonText: t('contactSales'),
      href: `https://wa.me/${whatsappNumber}?text=${date}%20Hi%21%20I%27m%20interested%20in%20Web%20App%20Development%20services%21`,
      // href: `mailto:${emailAddress}?subject=${date}%20Web%20App%20Development%20Enquiry&body=Hi%2C%20I%27m%20interested%20in%20Web%20App%20Development%20services.`,
    },
  ]

  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="text-center mb-12 w-full">
        {/* <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2> */}
        <h2 className="text-3xl font-semibold font-mono dark:text-stone-300 text-foreground">
          {t('title')}
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {pricingPlans.map((plan, index) => (
          <div key={index} className={
            `p-6 rounded-lg border ${plan.popular ? 'border-emerald-500 shadow-2xl shadow-cyan-500/35' : 'border-gray-200'} flex flex-col h-full`
          }>
            <div className="mb-4">
              <h3 className="text-xl font-thin">{plan.title}</h3>
              <div className="mt-2">
                <span className={`text-3xl font-bold ${plan.popular ? 'text-emerald-500' : 'dark:text-gray-300 text-gray-500'}`}>{plan.price}</span>
                {plan.price !== t('customPrice') && <span className="text-gray-500">
                  /{t('month')}
                </span>}
              </div>
              <p className={`mt-2 ${plan.popular ? 'text-emerald-500' : 'dark:text-stone-300 text-gray-500'}`}>{plan.description}</p>
            </div>

            <div className="flex-grow">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={plan.href}
              target={plan.href.startsWith('https') ? '_blank' : undefined}
              rel={plan.href.startsWith('https') ? 'noopener noreferrer' : undefined}
              className={`mt-6 flex items-center justify-center gap-2 py-2 hover:font-extrabold hover:tracking-tight border-gray-500 px-4 rounded-md ${plan.popular
                ? 'bg-gradient-to-r from-emerald-500 from-60% via-teal-500 to-cyan-600 text-white hover:bg-emerald-600 shadow-lg hover:shadow-emerald-500/50'
                : 'bg-gray-800 text-white hover:bg-gray-700'
                } transition-all hover:scale-105 duration-450`}
            >
              {plan.buttonText}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Pricing