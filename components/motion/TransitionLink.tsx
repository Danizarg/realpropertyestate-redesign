"use client";

import Link from "next/link";
import { useRef } from "react";
import { usePageTransition } from "./TransitionProvider";

type LinkProps = React.ComponentProps<typeof Link>;

interface TransitionLinkProps extends Omit<LinkProps, "href"> {
  href: string;
  /** Label shown on the transition curtain. */
  transitionLabel?: string;
  /** Morph the element marked [data-shared-image] inside this link into the next hero. */
  sharedImage?: boolean;
}

/** Internal link that plays the page transition. Modifier-clicks behave natively. */
export default function TransitionLink({
  href,
  transitionLabel,
  sharedImage,
  onClick,
  children,
  ...rest
}: TransitionLinkProps) {
  const { navigate } = usePageTransition();
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={ref}
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          rest.target === "_blank"
        ) {
          return;
        }
        e.preventDefault();
        const image = sharedImage
          ? (ref.current?.querySelector("[data-shared-image]") as HTMLElement | null)
          : null;
        navigate(href, { label: transitionLabel, image });
      }}
    >
      {children}
    </Link>
  );
}
