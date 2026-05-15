import React from 'react';

/**
 * My-Skoolz brand logo.
 * Design: graduate head with mortarboard cap — clean, minimal, scales
 * from 20 px to 90 px without losing clarity.
 */
const Logo = ({ size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="My-Skoolz"
  >
    {/* ── Background ───────────────────────────────────────────────── */}
    <rect width="40" height="40" rx="10" fill="url(#ms_bg)" />
    {/* top-light sheen */}
    <rect width="40" height="20" rx="10" fill="url(#ms_sheen)" opacity="0.14" />

    {/* ── Shoulders ────────────────────────────────────────────────── */}
    <path
      d="M8 39 Q14 33 20 33 Q26 33 32 39"
      fill="white"
      fillOpacity="0.58"
    />

    {/* ── Head (circle) ────────────────────────────────────────────── */}
    <circle cx="20" cy="26" r="9" fill="white" fillOpacity="0.92" />

    {/* ── Graduation cap board (mortarboard) ───────────────────────── */}
    {/* Wide flat diamond sitting on top of the head */}
    <path
      d="M7 17 L20 11 L33 17 L20 23 Z"
      fill="white"
    />

    {/* ── Tassel ───────────────────────────────────────────────────── */}
    {/* string drops from the right tip of the board */}
    <line
      x1="33" y1="17"
      x2="33" y2="25"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.72"
    />
    {/* tassel end */}
    <circle cx="33" cy="26.5" r="2" fill="white" opacity="0.72" />

    <defs>
      <linearGradient
        id="ms_bg"
        x1="0" y1="0" x2="40" y2="40"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>

      <linearGradient
        id="ms_sheen"
        x1="0" y1="0" x2="0" y2="20"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="white" stopOpacity="1" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

export default Logo;
