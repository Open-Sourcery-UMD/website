import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  weight: ['400'] 
});

export default function Home() {
  return (
    <main 
      className={`flex h-screen w-full items-center justify-center bg-black overflow-hidden ${spaceGrotesk.className}`}
    >
      <h1 className="text-center text-white text-[3rem] font-normal tracking-tight pointer-events-none select-none">
        Coming Soon...
      </h1>
    </main>
  );
}