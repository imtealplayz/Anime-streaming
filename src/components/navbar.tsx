"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

import Container from "./container";
import { Separator } from "./ui/separator";

import { nightTokyo } from "@/utils/fonts";
import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useState } from "react";

import SearchBar from "./search-bar";
import { MenuIcon, X, Compass, Home } from "lucide-react";
import useScrollPosition from "@/hooks/use-scroll-position";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import { pb } from "@/lib/pocketbase";

const menuItems: Array<{ title: string; href: string; icon: React.ReactNode }> = [
  { title: "Home", href: ROUTES.HOME, icon: <Home className="h-4 w-4" /> },
  { title: "Explore anime", href: ROUTES.SEARCH, icon: <Compass className="h-4 w-4" /> },
];

const NavBar = () => {
  const { y } = useScrollPosition();
  const isHeaderFixed = true;
  const isHeaderSticky = y > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth");
    pb.authStore.clear();
  }, []);

  return (
    <div
      className={cn([
        "h-fit w-full",
        "sticky top-0 z-[100] duration-300",
        isHeaderFixed ? "fixed bg-gradient-to-b from-slate-900/90" : "",
        isHeaderSticky
          ? "bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-20 bg-slate-950"
          : "",
      ])}
    >
      <Container className="flex items-center justify-between gap-4 py-2.5 sm:gap-8">
        <Link
          href={ROUTES.HOME}
          className="group flex shrink-0 cursor-pointer items-center gap-2.5 sm:gap-3"
          aria-label="AnimeTeal home"
        >
          <Image
            src="/animeteal-logo.svg"
            alt=""
            width={38}
            height={38}
            className="rounded-xl shadow-lg transition-transform group-hover:scale-105 sm:h-10 sm:w-10"
          />
          <h1
            className={cn([
              nightTokyo.className,
              "text-2xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-cyan-300 to-sky-300 sm:text-3xl",
            ])}
          >
            AnimeTeal
          </h1>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          {menuItems.map((menu) => (
            <Link
              href={menu.href}
              key={menu.href}
              className="text-sm font-semibold text-slate-300 transition hover:text-teal-200"
            >
              {menu.title}
            </Link>
          ))}
        </nav>

        <div className="hidden w-full max-w-md items-center gap-5 lg:flex">
          <SearchBar />
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <Link
            href={ROUTES.SEARCH}
            aria-label="Search anime"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/10"
          >
            <Compass className="h-5 w-5" />
          </Link>
          <MobileMenuSheet trigger={<MenuIcon className="h-6 w-6" />} />
        </div>
      </Container>
    </div>
  );
};

const MobileMenuSheet = ({ trigger }: { trigger: ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/10"
        aria-label="Open navigation menu"
      >
        {trigger}
      </SheetTrigger>
      <SheetContent
        className="z-[150] flex w-[min(88vw,380px)] flex-col"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative h-full w-full">
          <SheetClose className="absolute right-0 top-0 rounded-lg p-2 text-slate-300 hover:bg-white/10">
            <X className="h-5 w-5" />
          </SheetClose>
          <div className="mt-12 flex flex-col gap-3">
            <div className="mb-2 flex items-center gap-3">
              <Image
                src="/animeteal-logo.svg"
                alt=""
                width={42}
                height={42}
                className="rounded-xl"
              />
              <div>
                <p className="font-bold text-white">AnimeTeal</p>
                <p className="text-xs text-slate-400">Find your next favourite</p>
              </div>
            </div>
            {menuItems.map((menu) => (
              <Link
                href={menu.href}
                key={menu.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-teal-300/30 hover:bg-teal-300/10"
              >
                {menu.icon}
                {menu.title}
              </Link>
            ))}
            <Separator className="my-2" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Search the catalogue
            </p>
            <SearchBar onAnimeClick={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;
