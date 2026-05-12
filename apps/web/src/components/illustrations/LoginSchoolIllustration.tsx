const LoginSchoolIllustration = () => {
  return (
    <div className="relative mt-8 w-full max-w-[560px] lg:mt-10">
      <div className="absolute inset-x-8 bottom-4 h-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative mx-auto grid h-[280px] w-full max-w-[500px] place-items-center rounded-[34px] border border-primary/10 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:h-[320px]">
        <svg
          viewBox="0 0 520 320"
          aria-hidden="true"
          className="school-login-illustration h-full w-full max-w-[430px] px-8 text-primary"
          fill="none"
        >
          <defs>
            <linearGradient id="login-folder" x1="248" y1="84" x2="404" y2="236">
              <stop offset="0%" stopColor="#1F4D3A" />
              <stop offset="100%" stopColor="#16382A" />
            </linearGradient>
            <linearGradient id="login-paper" x1="94" y1="72" x2="252" y2="248">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#F8F6F2" />
            </linearGradient>
            <filter id="login-shadow" x="50" y="40" width="400" height="250" colorInterpolationFilters="sRGB">
              <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#172033" floodOpacity="0.12" />
            </filter>
          </defs>

          <g className="school-login-illustration__float" filter="url(#login-shadow)">
            <path
              d="M256 84h98c12 0 22 10 22 22v120c0 12-10 22-22 22H216c-12 0-22-10-22-22V112c0-15 13-27 28-25l34 4Z"
              fill="url(#login-folder)"
            />
            <path
              d="M218 103h126c8 0 15 7 15 15v109c0 8-7 15-15 15H218c-8 0-15-7-15-15V118c0-8 7-15 15-15Z"
              fill="#2F6B52"
              opacity="0.28"
            />
            <path
              d="M104 82h126c18 0 32 14 32 32v116c0 18-14 32-32 32H104c-18 0-32-14-32-32V114c0-18 14-32 32-32Z"
              fill="url(#login-paper)"
              stroke="#D8DED8"
              strokeWidth="3"
            />
            <path
              d="M104 116h48M104 152h88M104 188h88M104 224h66"
              stroke="#CBD3CB"
              strokeWidth="7"
              strokeLinecap="round"
              className="school-login-illustration__line"
            />
            <circle cx="206" cy="119" r="22" fill="#E7EFEA" stroke="#AFC0B6" strokeWidth="3" />
            <path
              d="M177 163c4-30 56-30 60 0"
              stroke="#AFC0B6"
              strokeWidth="12"
              strokeLinecap="round"
              className="school-login-illustration__line"
            />
            <rect x="98" y="145" width="30" height="30" rx="6" fill="#F7FBF9" stroke="#B5C4BA" strokeWidth="3" />
            <rect x="98" y="181" width="30" height="30" rx="6" fill="#F7FBF9" stroke="#B5C4BA" strokeWidth="3" />
            <rect x="98" y="217" width="30" height="30" rx="6" fill="#F7FBF9" stroke="#B5C4BA" strokeWidth="3" />
            <path
              d="m104 159 8 8 17-22"
              stroke="#D4A24C"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="school-login-illustration__check"
            />
            <path
              d="m104 195 8 8 17-22"
              stroke="#D4A24C"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="school-login-illustration__check school-login-illustration__check--late"
            />
            <path
              d="M296 228v-76l56-42 56 42v76"
              fill="#F8F6F2"
              stroke="#D4A24C"
              strokeWidth="4"
              strokeLinejoin="round"
              className="school-login-illustration__line"
            />
            <path d="M352 110V80l34 13-9 18" stroke="#D4A24C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="352" cy="158" r="13" fill="#FFFFFF" stroke="#D4A24C" strokeWidth="4" />
            <path d="M328 184h17v44h-17zm43 0h17v44h-17zm-21 24h18v20h-18z" fill="#FFFFFF" stroke="#D4A24C" strokeWidth="3" />
          </g>

          <path
            d="M60 118c12-3 19-10 22-22 3 12 10 19 22 22-12 3-19 10-22 22-3-12-10-19-22-22Z"
            fill="#D4A24C"
            className="school-login-illustration__spark"
          />
          <path
            d="M414 76c8-2 13-7 15-15 2 8 7 13 15 15-8 2-13 7-15 15-2-8-7-13-15-15Z"
            fill="#2F6B52"
            opacity="0.55"
            className="school-login-illustration__spark school-login-illustration__spark--late"
          />
        </svg>
      </div>
    </div>
  );
};

export default LoginSchoolIllustration;
