import React from 'react';

/**
 * My-Skoolz brand logo.
 * Design: bold "M" lettermark (double-peak shape) referencing the
 * brand name, with a graduation-cap bar across each peak.
 * Clean, minimal, scales perfectly from 20 px to 80 px.
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
    {/* Rounded-square background with blue→purple gradient */}
    <rect width="40" height="40" rx="10" fill="url(#ms_bg)"/>

    {/* Subtle top-light sheen for depth */}
    <rect width="40" height="20" rx="10" fill="url(#ms_sheen)" opacity="0.18"/>

    {/*
      M lettermark — two upward peaks meeting at the centre valley.
      The shape doubles as a mountain / peak-of-achievement motif.
    */}
    <path
      d="M6 30 L13.5 12 L20 21 L26.5 12 L34 30"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />

    {/*
      Graduation-cap board bars — a short horizontal line across the
      top of each peak, turning each peak into a mortarboard.
    */}
    <line x1="9"  y1="11.5" x2="18" y2="11.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" opacity="0.72"/>
    <line x1="22" y1="11.5" x2="31" y2="11.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" opacity="0.72"/>

    <defs>
      <linearGradient id="ms_bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB"/>
        <stop offset="1" stopColor="#7C3AED"/>
      </linearGradient>
      <linearGradient id="ms_sheen" x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" stopOpacity="1"/>
        <stop offset="1" stopColor="white" stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

export default Logo;
