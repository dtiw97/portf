import Hero from "./home/Hero";
import Works from "./home/Works";
import { AnimatedNumber } from "@/components/ui/motion/number/animated-number";

export const runtime = 'edge';

export default async function Index() {
  return (
    <div>
      <Hero />
      <Works />
    </div>
  );
}

