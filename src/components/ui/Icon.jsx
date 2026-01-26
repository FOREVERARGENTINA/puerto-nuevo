import React from 'react';
import './Icon.css';

export default function Icon({ name, size = 20, className = '', ariaHidden = true, ...props }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': ariaHidden ? 'true' : undefined,
    className,
    ...props,
  };

  switch (name) {
    case 'bell':
      return (
        <svg {...common}>
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'check-circle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7 12.5l2.5 2.5L17 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'search':
      return (
        <svg {...common}>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );

    case 'user':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'home':
      return (
        <svg {...common}>
          <path d="M3 11l9-7 9 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 10.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M22 21v-1a3 3 0 0 0-2.4-2.94" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.5 3.8a3.2 3.2 0 0 1 0 6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'send':
      return (
        <svg {...common}>
          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17.5a1.5 1.5 0 0 1-1.5 1.5H6.5A2.5 2.5 0 0 1 4 19.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 6h12.5A2.5 2.5 0 0 1 19 8.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'file':
      return (
        <svg {...common}>
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'image':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M21 16l-5.5-5.5L8 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'snack':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9" cy="10" r="1.2" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="13.5" cy="9" r="1.1" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="14" cy="14" r="1.3" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="9" cy="15" r="1.1" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );

    case 'event':
      return (
        <svg {...common}>
          <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 7v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'menu':
      return (
        <svg {...common}>
          <path d="M3 6h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
}
