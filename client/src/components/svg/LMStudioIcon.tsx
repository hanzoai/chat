import React from 'react';

export default function LMStudioIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 12h2v5H7v-5zM10 7h2v10h-2V7zM13 9h2v8h-2V9zM16 11h2v6h-2v-6z"
        fill="currentColor"
      />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
