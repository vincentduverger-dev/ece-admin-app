const CsvImportSuccessAnimation = ({ className = "" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 240 160"
      aria-hidden="true"
      className={`csv-import-success-animation w-full max-w-full ${className}`}
      fill="none"
    >
      <style>
        {`
          .csv-import-success-animation .csv-success-fade {
            animation: csv-success-fade 520ms ease-out forwards;
            opacity: 0;
          }

          .csv-import-success-animation .csv-success-draw {
            animation: csv-success-draw 760ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
            opacity: 0;
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
          }

          .csv-import-success-animation .csv-success-arrow {
            animation-delay: 360ms;
          }

          .csv-import-success-animation .csv-success-db {
            animation-delay: 640ms;
          }

          .csv-import-success-animation .csv-success-check {
            animation: csv-success-check 420ms cubic-bezier(0.22, 1, 0.36, 1) 1040ms forwards;
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
          }

          @keyframes csv-success-fade {
            from {
              opacity: 0;
              transform: translateY(4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes csv-success-draw {
            0% {
              opacity: 0;
              stroke-dashoffset: 1;
            }
            20% {
              opacity: 1;
            }
            100% {
              opacity: 1;
              stroke-dashoffset: 0;
            }
          }

          @keyframes csv-success-check {
            from {
              opacity: 0;
              transform: scale(0.82);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .csv-import-success-animation .csv-success-fade,
            .csv-import-success-animation .csv-success-draw,
            .csv-import-success-animation .csv-success-check {
              animation: none;
              opacity: 1;
              stroke-dashoffset: 0;
              transform: none;
            }
          }
        `}
      </style>

      <path
        className="csv-success-fade"
        d="M39 117c18 26 62 33 103 23 38-10 62-12 77-40"
        stroke="#8FA99B"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.32"
      />

      <g className="csv-success-fade" stroke="#1F4D3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M43 28h55l22 22v78H43V28Z" fill="#FFFFFF" />
        <path d="M98 28v23h22" fill="#F8F6F2" />
        <rect x="57" y="67" width="45" height="24" rx="7" fill="#D4A24C" stroke="none" />
        <path d="M65 79h4M77 79h5M90 79h4" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M58 103h39M58 114h31" stroke="#8FA99B" strokeWidth="3" />
      </g>

      <g
        className="csv-success-draw csv-success-arrow"
        stroke="#D4A24C"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path pathLength={1} d="M126 80h45" />
        <path pathLength={1} d="m157 66 16 14-16 14" />
      </g>

      <g
        className="csv-success-draw csv-success-db"
        stroke="#1F4D3A"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse pathLength={1} cx="188" cy="56" rx="29" ry="12" fill="#F8F6F2" />
        <path pathLength={1} d="M159 56v48c0 7 13 12 29 12s29-5 29-12V56" />
        <path pathLength={1} d="M159 80c0 7 13 12 29 12s29-5 29-12" />
        <path pathLength={1} d="M159 102c0 7 13 12 29 12s29-5 29-12" />
      </g>

      <g className="csv-success-check">
        <circle cx="191" cy="41" r="20" fill="#FFFFFF" stroke="#D4A24C" strokeWidth="3" />
        <path d="m181 41 7 7 15-17" stroke="#2F855A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
};

export default CsvImportSuccessAnimation;
