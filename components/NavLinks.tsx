"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "현황·응원" },
  { href: "/timeline", label: "타임라인" },
  { href: "/news", label: "관련 소식" },
  { href: "/act", label: "행동하기" },
];

export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="order-3 -mx-2 w-full overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto">
      <ul className="flex gap-1 text-[15px]">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-md px-2.5 py-2 font-medium transition-colors duration-150 ${
                  active ? "text-ink underline decoration-seal decoration-2 underline-offset-[6px]" : "text-ink-2 hover:bg-rule-2 hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
