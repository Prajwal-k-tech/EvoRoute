import { SVGProps } from 'react';

export function RouterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="8" x="2" y="8" rx="2" />
      <path d="M6.3 16H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2.3" />
      <path d="M17.7 8H20a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2.3" />
      <path d="M12 16v-4" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
    </svg>
  );
}

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 18L9 6l4 12 4-12 4 12" />
    </svg>
  )
}
