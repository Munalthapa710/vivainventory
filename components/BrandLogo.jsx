"use client";

export default function BrandLogo({
  size = 44,
  showText = false,
  title = "VivaInventory",
  subtitle,
  className = "",
  textClassName = "",
  logoClassName = "",
  titleClassName = "",
  subtitleClassName = ""
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src="/logo.svg"
        alt="VivaInventory logo"
        width={size}
        height={size}
        draggable="false"
        className={`shrink-0 select-none ${logoClassName}`.trim()}
      />

      {showText ? (
        <div className={`min-w-0 ${textClassName}`.trim()}>
          <h2
            className={`truncate font-bold text-slate-900 ${titleClassName}`.trim()}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={`truncate text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 ${subtitleClassName}`.trim()}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
