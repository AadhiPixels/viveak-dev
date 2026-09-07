import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
  size?: "md" | "sm";
};

type LinkButtonProps = CommonProps & {
  href: string;
  download?: boolean | string;
  external?: boolean;
} & Omit<ComponentProps<"a">, "href" | "children" | "className">;

type NativeButtonProps = CommonProps & Omit<ComponentProps<"button">, "children" | "className">;

function classes(variant: Variant, size: "md" | "sm", className: string) {
  return `btn btn-${variant} ${size === "sm" ? "min-h-9 px-3.5 py-2 text-[0.85rem]" : ""} ${className}`;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  download,
  external,
  ...rest
}: LinkButtonProps) {
  const isExternal = external || /^https?:|^mailto:/.test(href);
  if (isExternal || download) {
    return (
      <a
        href={href}
        className={classes(variant, size, className)}
        download={download}
        {...(isExternal && !href.startsWith("mailto:")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  type = "button",
  ...rest
}: NativeButtonProps) {
  return (
    <button type={type} className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
