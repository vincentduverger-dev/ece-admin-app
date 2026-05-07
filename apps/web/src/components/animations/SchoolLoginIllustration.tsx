type SchoolLoginIllustrationProps = {
  className?: string;
};

const SchoolLoginIllustration = ({ className = "" }: SchoolLoginIllustrationProps) => {
  return (
    <svg
      viewBox="0 0 520 360"
      aria-hidden="true"
      className={`school-login-svg-animation w-full max-w-full ${className}`}
      fill="none"
    >
      <style>
        {`
          .school-login-svg-animation .school-login-bg {
            animation: school-login-bg-fade 480ms ease-out forwards;
            opacity: 0;
          }

          .school-login-svg-animation .school-login-draw {
            animation: school-login-line-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
            opacity: 0;
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
          }

          .school-login-svg-animation .school-login-building {
            animation-delay: 220ms;
          }

          .school-login-svg-animation .school-login-notebook {
            animation-delay: 680ms;
          }

          .school-login-svg-animation .school-login-details {
            animation-delay: 1040ms;
          }

          .school-login-svg-animation .school-login-pencil {
            animation-delay: 1320ms;
          }

          .school-login-svg-animation .school-login-pop {
            animation: school-login-pop-in 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
          }

          .school-login-svg-animation .school-login-flag {
            animation-delay: 1640ms;
          }

          .school-login-svg-animation .school-login-flag-letter {
            animation: school-login-letter-in 280ms ease-out forwards;
            fill: #1F4D3A;
            font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.7px;
            opacity: 0;
            stroke: none;
            stroke-width: 0;
            transform-box: fill-box;
            transform-origin: center;
          }

          .school-login-svg-animation .school-login-flag-letter--e1 {
            animation-delay: 2060ms;
          }

          .school-login-svg-animation .school-login-flag-letter--c {
            animation-delay: 2200ms;
          }

          .school-login-svg-animation .school-login-flag-letter--e2 {
            animation-delay: 2340ms;
          }

          @keyframes school-login-bg-fade {
            from {
              opacity: 0;
              transform: scale(0.985);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes school-login-line-draw {
            0% {
              opacity: 0;
              stroke-dashoffset: 1;
            }
            18% {
              opacity: 1;
            }
            100% {
              opacity: 1;
              stroke-dashoffset: 0;
            }
          }

          @keyframes school-login-pop-in {
            0% {
              opacity: 0;
              transform: translateY(5px) scale(0.92);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes school-login-letter-in {
            0% {
              opacity: 0;
              transform: translateY(2px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .school-login-svg-animation .school-login-bg,
            .school-login-svg-animation .school-login-draw,
            .school-login-svg-animation .school-login-pop,
            .school-login-svg-animation .school-login-flag-letter {
              animation: none;
              opacity: 1;
              stroke-dashoffset: 0;
              transform: none;
            }
          }
        `}
      </style>

      <path
        className="school-login-bg"
        d="M73 198c-26-73 38-140 122-147 62-5 83 23 134 21 56-2 102-24 130 19 30 46-3 104 4 143 8 43 48 76 19 102-31 29-90-8-148-3-72 7-113 42-175 23-58-18-67-105-86-158Z"
        fill="#F8F6F2"
      />
      <path
        className="school-login-bg"
        d="M92 239c36 63 111 84 182 72 76-13 141-33 161-91"
        stroke="#8FA99B"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
      />

      <g
        className="school-login-draw school-login-building"
        stroke="#1F4D3A"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path pathLength={1} d="M206 248V154l72-48 72 48v94" />
        <path pathLength={1} d="M183 248h190" />
        <path pathLength={1} d="M225 164h106" />
        <path pathLength={1} d="M244 248v-42h28v42M287 248v-42h28v42" />
        <path pathLength={1} d="M258 180h40M258 194h40" />
        <circle pathLength={1} cx="278" cy="145" r="13" />
        <path pathLength={1} d="M278 106V72" />
      </g>

      <g
        className="school-login-pop school-login-flag"
        stroke="#D4A24C"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M278 75h62l-10 15 10 15h-62" fill="#FFF7E8" />
        <text className="school-login-flag-letter school-login-flag-letter--e1" x="288" y="95">
          E
        </text>
        <text className="school-login-flag-letter school-login-flag-letter--c" x="304" y="95">
          C
        </text>
        <text className="school-login-flag-letter school-login-flag-letter--e2" x="320" y="95">
          E
        </text>
      </g>

      <g
        className="school-login-draw school-login-notebook"
        stroke="#1F4D3A"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect pathLength={1} x="82" y="126" width="112" height="142" rx="16" fill="#FFFFFF" />
        <path pathLength={1} d="M111 126v142M98 154h-18M98 184h-18M98 214h-18M98 244h-18" />
      </g>

      <g
        className="school-login-draw school-login-details"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path pathLength={1} d="M128 158h42M128 188h38M128 218h44" stroke="#8FA99B" strokeWidth="4" />
        <path pathLength={1} d="M94 158h14v14H94zM94 188h14v14H94zM94 218h14v14H94z" stroke="#6B9F8F" strokeWidth="3" />
        <path pathLength={1} d="m96 162 5 5 11-15M96 192l5 5 11-15" stroke="#D4A24C" strokeWidth="3.5" />
      </g>

      <g
        className="school-login-draw school-login-pencil"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path pathLength={1} d="M164 272 228 178" stroke="#D4A24C" strokeWidth="12" />
        <path pathLength={1} d="M223 175 238 163 233 183Z" fill="#1F4D3A" />
        <path pathLength={1} d="M156 284 164 272" stroke="#1F4D3A" strokeWidth="12" />
        <path pathLength={1} d="M182 244 224 182" stroke="#FFFFFF" strokeWidth="2.4" opacity="0.85" />
      </g>
    </svg>
  );
};

export default SchoolLoginIllustration;
