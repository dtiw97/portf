import Hero from "./home/Hero";
import Works from "./home/Works";

export const runtime = 'edge';

export default async function Index() {
  return (
    <div>
      <Hero />
      <Works />
    </div>
  );
}

