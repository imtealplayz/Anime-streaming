import React from "react";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="w-full bg-slate-950/80 border-t border-slate-900 shadow-xl p-6 flex flex-col items-center space-y-4">
      <div className="flex items-center gap-2">
        <Image
          src="/animeteal-logo.svg"
          alt="AnimeTeal logo"
          width="40"
          height="40"
          className="rounded-xl shadow-md"
        />
        <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-500 to-cyan-400">
          AnimeTeal
        </span>
      </div>
      <p className="text-xs text-gray-400 text-center max-w-xl">
        AnimeTeal does not store any files on the server; it only displays metadata
        and links to media hosted on 3rd party services.
      </p>
      <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} AnimeTeal. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
