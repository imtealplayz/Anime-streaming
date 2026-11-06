import Link from "next/link";
import { ArrowRight, Smartphone } from "lucide-react";
import Container from "./container";
import { ROUTES } from "@/constants/routes";

const AppDownloadPromo = () => {
  return (
    <Container className="pb-7 pt-1 sm:pb-9">
      <Link
        href={ROUTES.DOWNLOAD}
        className="group flex flex-col gap-4 rounded-2xl border border-teal-300/20 bg-gradient-to-r from-teal-300/[0.09] via-cyan-300/[0.05] to-slate-900/70 p-4 shadow-lg shadow-black/10 transition hover:border-teal-200/40 hover:bg-teal-300/[0.08] sm:flex-row sm:items-center sm:gap-5 sm:p-5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-200/20 bg-teal-300/10 text-teal-100">
          <Smartphone className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-teal-200/90">
            AnimeTeal for Android
          </span>
          <span className="mt-1 block text-base font-bold text-white sm:text-lg">
            Take AnimeTeal with you
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-300 sm:text-sm">
            Watch in the dedicated app with a built-in player and mobile-friendly controls.
          </span>
        </span>
        <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-teal-200/20 bg-teal-300/10 px-4 py-2 text-sm font-bold text-teal-100 transition group-hover:border-teal-200/40 group-hover:bg-teal-300/15 sm:self-center">
          Get the app
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </Container>
  );
};

export default AppDownloadPromo;
