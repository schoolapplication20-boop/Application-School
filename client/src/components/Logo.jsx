import React from 'react';

const Logo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background */}
    <rect width="40" height="40" rx="10" fill="#1d4ed8"/>
    <rect width="40" height="40" rx="10" fill="url(#logo_paint)" fillOpacity="0.9"/>

    {/* Graduation cap board */}
    <path d="M20 9L32 15L20 21L8 15L20 9Z" fill="white"/>

    {/* Cap body / tassel holder */}
    <path
      d="M13.5 18.5V24.5C13.5 24.5 16 27.5 20 27.5C24 27.5 26.5 24.5 26.5 24.5V18.5L20 21L13.5 18.5Z"
      fill="white"
      fillOpacity="0.85"
    />

    {/* Tassel string */}
    <line x1="31" y1="15" x2="31" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    {/* Tassel end */}
    <circle cx="31" cy="24.5" r="1.8" fill="white"/>

    <defs>
      <linearGradient id="logo_paint" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6"/>
        <stop offset="1" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
  </svg>
);

export default Logo;
