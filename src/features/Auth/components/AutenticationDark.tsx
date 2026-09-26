import { BRAND_NAME } from '@/shared/lib/branding';
import Link from 'next/link';

function AutenticationDark() {
  return (
    <div className="dark:z-40 hidden flex-col p-10 lg:flex dark:border-r min-h-screen text-black dark:bg-slate-950">
      <div className="absolute border-r-white/15 border-r-2 top-0 left-0 h-full w-full dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,167,38,0.15),rgba(30,41,59,0.9))]"></div>
      <Link className="relative z-20 flex items-center font-bold text-2xl dark:text-white" href="/">
        <span className="text-brand lowercase">{BRAND_NAME}</span>
      </Link>
      <div className="relative z-20 mt-auto ">
        <blockquote className="space-y-2">
          <p className="text-xl bg-transparent text-pretty dark:text-white">
            Combinamos control de procesos, desarrollo de software y consultoría organizacional para ofrecerte
            soluciones integrales que generan resultados reales.
          </p>
          <footer className="text-md dark:text-white">{BRAND_NAME}</footer>
        </blockquote>
      </div>
    </div>
  );
}

export default AutenticationDark;
