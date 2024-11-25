import Link from 'next/link'
import { Mail, MessageCircleMore } from 'lucide-react'

// Contact page component
export default function ContactPage() {
  // Replace with your actual contact details
  const emailAddress = "david.tiw.minjie@gmail.com  "
  const whatsappNumber = "125552420"  // Include country code without +
  // Hi I would like to enquire about Web App Development!
  const whatsappMessage = "Hi%21%20I%20would%20like%20to%20enquire%20about%20Web%20App%20Development!"

  return (
    <div className="flex flex-col items-left justify-center">
      <h1 className="text-xl font-mono tracking-tighter font-medium mb-8 bg-gradient-to-r from-emerald-500 to-blue-400 bg-clip-text text-transparent">Let us know what's on your mind</h1>

      <div className="flex flex-col gap-4">
        {/* Email Button */}
        <Link
          href={`mailto:${emailAddress}`}
          className="flex items-center gap-2 border hover:border-emerald-500 text-white px-6 py-3 rounded-lg transition-all duration-450 hover:shadow-md hover:shadow-cyan-500/40"
        >
          <Mail className="w-5 h-5 dark:text-stone-300 text-black" />
          <span className='tracking-widest font-thin dark:text-stone-300 text-black'>Email Us</span>
        </Link>

        {/* WhatsApp Button */}
        <Link
          href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border  hover:border-emerald-500 text-white px-6 py-3 rounded-lg transition-all duration-450 hover:shadow-md hover:shadow-cyan-500/40"
        >
          <MessageCircleMore className="w-5 h-5 dark:text-stone-300 text-black" />
          <span className='tracking-widest font-thin dark:text-stone-300 text-black'>WhatsApp</span>
        </Link>
      </div>
    </div>
  )
}
