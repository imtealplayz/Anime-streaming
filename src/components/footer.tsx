import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { ROUTES } from "@/constants/routes";

const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-900 bg-slate-950/80 p-6 shadow-xl">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center gap-2">
          <Image
            src="/animeteal-logo.svg"
            alt="AnimeTeal logo"
            width="40"
            height="40"
            className="rounded-xl shadow-md"
          />
          <span className="bg-gradient-to-r from-violet-400 via-pink-500 to-cyan-400 bg-clip-text text-xl font-bold tracking-wider text-transparent">
            AnimeTeal
          </span>
        </div>
        <Link
          href={ROUTES.DOWNLOAD}
          className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.07] px-4 py-2 text-sm font-semibold text-teal-100 transition hover:border-teal-200/40 hover:bg-teal-300/10"
        >
          <Download className="h-4 w-4" />
          Download AnimeTeal for Android
        </Link>
        <p className="max-w-xl text-center text-xs text-gray-400">
          AnimeTeal does not store any files on the server; it only displays metadata
          and links to media hosted on 3rd party services.
        </p>
        <p className="text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} AnimeTeal. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
