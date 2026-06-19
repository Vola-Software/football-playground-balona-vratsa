"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import SignOutButton from "./sign-out-button";

interface NavbarClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export default function NavbarClient({ user }: NavbarClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // The invisible measurement div always mirrors the full set of nav links at natural width
  const measureRef = useRef<HTMLDivElement>(null);
  // The available-width container for nav links (right side of the bar)
  const containerRef = useRef<HTMLDivElement>(null);

  const check = useCallback(() => {
    if (!measureRef.current || !containerRef.current) return;
    setIsOverflowing(measureRef.current.scrollWidth > containerRef.current.clientWidth);
  }, []);

  useEffect(() => {
    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [check]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const linkClass = "text-gray-600 hover:text-gray-900 transition-colors";
  const dropdownLinkClass =
    "block px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors";

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-gray-900 hover:text-green-700 transition-colors shrink-0"
        >
          <span className="text-xl">⚽</span>
          <span className="hidden sm:inline">Балона Враца</span>
        </Link>

        {/*
          Invisible measurement container: always in the DOM, hidden, not interactive.
          Renders all nav items at their natural (unconstrained) width so we can compare
          against the available space.
        */}
        <div
          ref={measureRef}
          aria-hidden="true"
          className="invisible absolute whitespace-nowrap flex items-center gap-4 text-sm pointer-events-none"
        >
          <span>Календар</span>
          <span>Как работи?</span>
          {user ? (
            <>
              <span>Моите резервации</span>
              {user.role === "ADMIN" && <span>Администрация</span>}
              <span className="text-gray-300">|</span>
              <span className="truncate max-w-[140px]">{user.name ?? user.email}</span>
              <span>Изход</span>
            </>
          ) : (
            <>
              <span>Вход</span>
              <span>Регистрация</span>
            </>
          )}
        </div>

        {/* Right side: either inline links or hamburger */}
        <div ref={containerRef} className="flex items-center min-w-0">
          {isOverflowing ? (
            /* ── Hamburger mode ── */
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Навигационно меню"
                aria-expanded={menuOpen}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <HamburgerIcon open={menuOpen} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[200px] z-50 text-sm">
                  <Link href="/" className={dropdownLinkClass} onClick={close}>
                    Календар
                  </Link>
                  <Link href="/how-it-works" className={dropdownLinkClass} onClick={close}>
                    Как работи?
                  </Link>

                  {user ? (
                    <>
                      <Link href="/account" className={dropdownLinkClass} onClick={close}>
                        Моите резервации
                      </Link>
                      {user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-green-700 font-medium hover:text-green-900 hover:bg-gray-50 transition-colors"
                          onClick={close}
                        >
                          Администрация
                        </Link>
                      )}
                      <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                        <div className="px-4 py-1 text-xs text-gray-400 truncate">
                          {user.name ?? user.email}
                        </div>
                        <div className="px-4 py-1.5">
                          <SignOutButton />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className={dropdownLinkClass} onClick={close}>
                        Вход
                      </Link>
                      <div className="px-3 py-1.5">
                        <Link
                          href="/register"
                          className="block text-center bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
                          onClick={close}
                        >
                          Регистрация
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Inline links mode ── */
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className={linkClass}>
                Календар
              </Link>
              <Link href="/how-it-works" className={linkClass}>
                Как работи?
              </Link>

              {user ? (
                <>
                  <Link href="/account" className={linkClass}>
                    Моите резервации
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="text-green-700 font-medium hover:text-green-900 transition-colors"
                    >
                      Администрация
                    </Link>
                  )}
                  <span className="text-gray-300 select-none">|</span>
                  <span className="text-gray-500 hidden sm:inline truncate max-w-[140px]">
                    {user.name ?? user.email}
                  </span>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className={linkClass}>
                    Вход
                  </Link>
                  <Link
                    href="/register"
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
