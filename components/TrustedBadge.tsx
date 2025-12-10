export function TrustedBadge({ className }: { className?: string }) {
  return (
    <span
      className={`trusted-badge${className ? ` ${className}` : ""}`}
      aria-label="Trusted seller"
      title="Trusted seller"
    >
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-hidden="true"
        focusable="false"
        className="trusted-badge__icon"
      >
        <path
          fill="currentColor"
          d="M12 2 3 6.5V14c0 5 3.37 9.9 8.4 11.5.39.12.81.12 1.2 0C17.63 23.9 21 19 21 14V6.5L12 2Zm0 2.2 6 3V14c0 3.76-2.46 7.36-6 8.63C8.46 21.36 6 17.76 6 14V7.2l6-3Zm3.53 5.57L11 14.3l-2.53-2.54-1.42 1.42L11 17.64l6.47-6.47-1.42-1.42Z"
        />
      </svg>
    </span>
  );
}
