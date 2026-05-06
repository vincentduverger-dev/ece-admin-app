const EmailSentAnimation = ({ className = "" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 220 150"
      aria-hidden="true"
      className={`email-sent-success-animation w-full max-w-full ${className}`}
      fill="none"
    >
      <style>
        {`
          .email-sent-success-animation .email-sent-envelope {
            animation: email-sent-fade 520ms ease-out forwards;
            opacity: 0;
          }

          .email-sent-success-animation .email-sent-draw {
            animation: email-sent-draw 720ms cubic-bezier(0.22, 1, 0.36, 1) 420ms forwards;
            opacity: 0;
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
          }

          .email-sent-success-animation .email-sent-check {
            animation: email-sent-check 420ms cubic-bezier(0.22, 1, 0.36, 1) 980ms forwards;
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
          }

          @keyframes email-sent-fade {
            from {
              opacity: 0;
              transform: translateX(-5px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes email-sent-draw {
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

          @keyframes email-sent-check {
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
            .email-sent-success-animation .email-sent-envelope,
            .email-sent-success-animation .email-sent-draw,
            .email-sent-success-animation .email-sent-check {
              animation: none;
              opacity: 1;
              stroke-dashoffset: 0;
              transform: none;
            }
          }
        `}
      </style>

      <path
        d="M32 107c29 18 75 24 132 8"
        stroke="#8FA99B"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.26"
      />

      <g className="email-sent-envelope" stroke="#1F4D3A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="38" y="47" width="94" height="62" rx="14" fill="#FFFFFF" />
        <path d="m44 55 41 34 41-34" />
        <path d="m45 101 31-26M125 101 94 75" stroke="#6B9F8F" strokeWidth="3" />
      </g>

      <g
        className="email-sent-draw"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path pathLength={1} d="M135 54c19-12 39-12 58-1" stroke="#D4A24C" strokeWidth="4" />
        <path pathLength={1} d="M173 42h22v22" stroke="#D4A24C" strokeWidth="4" />
        <path pathLength={1} d="M137 73c13-6 27-6 42-1" stroke="#8FA99B" strokeWidth="3" />
      </g>

      <g className="email-sent-check">
        <circle cx="164" cy="93" r="24" fill="#FFFFFF" stroke="#D4A24C" strokeWidth="3" />
        <path d="m152 93 8 8 17-19" stroke="#2F855A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
};

export default EmailSentAnimation;
