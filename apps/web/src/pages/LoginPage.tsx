import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useToast } from "../context/ToastContext";
import { useAuth } from "../hooks/useAuth";

const serifFontStyle = {
  fontFamily: 'Georgia, "Times New Roman", serif'
} as const;

const BrandHeader = () => {
  return (
    <header className="relative overflow-hidden bg-primary shadow-[inset_0_-2px_0_rgba(212,162,76,0.95)]">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-center gap-4 px-6 py-6 sm:gap-5 sm:px-10 sm:py-7 lg:gap-6 lg:px-14 lg:py-8">
        <img
          src="/logo_ece.png"
          alt="Logo de l'École de la Culture et de l'Éducation"
          className="h-[82px] w-[82px] rounded-full object-cover shadow-[0_12px_24px_rgba(0,0,0,0.16)] sm:h-[96px] sm:w-[96px] lg:h-[112px] lg:w-[112px]"
        />
        <div className="min-w-0 text-white">
          <p
            style={serifFontStyle}
            className="text-[2rem] leading-none tracking-[-0.03em] sm:text-[2.6rem] lg:text-[3.1rem]"
          >
            ECE
          </p>
          <p
            style={serifFontStyle}
            className="mt-1 text-sm leading-tight text-white/95 sm:text-[1.35rem] lg:text-[2rem]"
          >
            École de la Culture et de l&apos;Éducation
          </p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_48%)]" />
    </header>
  );
};

const EmailIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#48564b]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 7.5a2.25 2.25 0 0 1 2.25-2.25h12a2.25 2.25 0 0 1 2.25 2.25v9A2.25 2.25 0 0 1 18 18.75H6A2.25 2.25 0 0 1 3.75 16.5v-9Z" />
      <path d="m4.5 8.25 6.66 5.1a1.5 1.5 0 0 0 1.82 0l6.52-5.1" />
    </svg>
  );
};

const LockIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#48564b]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.25 10.5V8.25a3.75 3.75 0 0 1 7.5 0v2.25" />
      <rect x="4.5" y="10.5" width="15" height="9" rx="2.25" />
      <path d="M12 13.5v3" />
    </svg>
  );
};

const EyeIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#314236]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6-9.75-6-9.75-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
};

const EyeOffIcon = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-[#314236]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 4.5 20.25 21" />
      <path d="M10.58 5.42A10.6 10.6 0 0 1 12 5.25c6 0 9.75 6 9.75 6a18.08 18.08 0 0 1-3.12 3.8" />
      <path d="M14.79 14.8A3 3 0 0 1 9.2 9.2" />
      <path d="M6.07 8.02A18.1 18.1 0 0 0 2.25 12s3.75 6 9.75 6c1.2 0 2.32-.24 3.35-.66" />
    </svg>
  );
};

const StatusSpinner = ({ className = "" }: { className?: string }) => {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary ${className}`.trim()}
    />
  );
};

const LoginIllustration = () => {
  return (
    <div className="relative mt-8 w-full max-w-[560px] lg:mt-12">
      <div className="login-illustration__halo absolute -bottom-6 -left-10 h-[282px] w-[320px] rounded-[46%] bg-slate-200/30 blur-[2px]" />
      <svg
        viewBox="0 0 560 340"
        aria-hidden="true"
        className="relative w-full text-[#b8c2b7]"
        fill="none"
      >
        <path
          d="M28 300h496"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--1"
          pathLength={1}
        />
        <path
          d="M84 300V132c0-8.8 7.2-16 16-16h166c8.8 0 16 7.2 16 16v168"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--2"
          pathLength={1}
        />
        <path
          d="M124 116c0-20.4 16.6-37 37-37s37 16.6 37 37"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--2"
          pathLength={1}
        />
        <path
          d="M110 122h102"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--2"
          pathLength={1}
        />
        <circle
          cx="161"
          cy="96"
          r="4.5"
          fill="currentColor"
          className="login-illustration__dot"
        />
        <path
          d="M122 174h24v24h-24zm0 55h24v24h-24zm0 55h24v24h-24z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          className="login-illustration__line login-illustration__line--3"
          pathLength={1}
        />
        <path
          d="m126 184 8 9 18-19m-26 65 8 9 18-19m-26 65 8 9 18-19"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="login-illustration__check login-illustration__check--1"
        />
        <path
          d="M170 186h70m-70 55h70m-70 55h56"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--4"
          pathLength={1}
        />
        <path
          d="M320 299V152l88-66 88 66v147"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="login-illustration__line login-illustration__line--3"
          pathLength={1}
        />
        <path
          d="M382 86V40l48 18-12 26"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="login-illustration__line login-illustration__line--2"
          pathLength={1}
        />
        <circle
          cx="408"
          cy="140"
          r="16"
          stroke="currentColor"
          strokeWidth="3.2"
          className="login-illustration__line login-illustration__line--4"
          pathLength={1}
        />
        <path
          d="M350 176h26v38h-26zm90 0h26v38h-26zm0 68h26v38h-26zm-90 68h118"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          className="login-illustration__line login-illustration__line--5"
          pathLength={1}
        />
        <path
          d="M388 214h40v86h-40z"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinejoin="round"
          className="login-illustration__line login-illustration__line--5"
          pathLength={1}
        />
        <path
          d="M408 214v86m-30 0h60m-78 15h96"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--5"
          pathLength={1}
        />
        <path
          d="M190 248h72"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--4"
          pathLength={1}
        />
        <path
          d="M214 216 250 244 208 295 172 267Z"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinejoin="round"
          className="login-illustration__pen"
        />
        <path
          d="M250 244 269 225c8-8 8-20.8 0-28.8l-7.2-7.2c-8-8-20.8-8-28.8 0L214 216"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="login-illustration__pen"
        />
        <path
          d="M204 296c20-8 43-8 63 0"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--6"
          pathLength={1}
        />
        <path
          d="M496 300v-44c0-26 21.4-47 47.4-47M520 300v-25m0-25a16 16 0 1 0 0 32"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="login-illustration__line login-illustration__line--6"
          pathLength={1}
        />
      </svg>
    </div>
  );
};

type LoginCardStateProps = {
  title: string;
  description: string;
};

const LoginCardState = ({ title, description }: LoginCardStateProps) => {
  return (
    <div className="mt-12 rounded-[22px] bg-background/70 px-5 py-6 text-slate-700">
      <div className="flex items-center gap-3">
        <StatusSpinner />
        <p className="text-lg font-medium text-slate-800">{title}</p>
      </div>
      <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
};

const LoginPage = () => {
  const { isAuthenticated, isLoadingAuth, login } = useAuth();
  const { showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      window.location.replace("/");
    }
  }, [isAuthenticated, isLoadingAuth]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
      window.location.replace("/");
    } catch (loginError) {
      const nextErrorMessage =
        loginError instanceof Error
          ? loginError.message
          : "Impossible de se connecter pour le moment.";

      setErrorMessage(nextErrorMessage);
      showError(nextErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCardBusy = isLoadingAuth || isSubmitting || isAuthenticated;

  return (
    <main className="min-h-screen bg-[#faf7f1] text-slate-900">
      <div className="flex min-h-screen flex-col">
        <BrandHeader />

        <section className="relative flex flex-1 items-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_34%,rgba(255,255,255,0.95),transparent_32%),radial-gradient(circle_at_72%_26%,rgba(255,255,255,0.8),transparent_28%),radial-gradient(circle_at_50%_78%,rgba(212,162,76,0.08),transparent_24%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(255,255,255,0.78),transparent)]" />

          <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-10 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(470px,540px)] lg:gap-16 lg:px-14 lg:py-12">
            <aside className="order-2 flex flex-col justify-center self-center lg:order-1 lg:pr-4">
              <div className="max-w-[650px]">
                <h1
                  style={serifFontStyle}
                  className="text-[2.45rem] leading-[1.05] tracking-[-0.04em] text-primary sm:text-[2.8rem] lg:text-[3.15rem]"
                >
                  Connexion administrateur
                </h1>
                <p className="mt-7 max-w-[540px] text-[1.18rem] leading-[2.05rem] text-slate-600 sm:text-[1.34rem] sm:leading-[2.35rem]">
                  Accédez à votre espace de gestion des demandes d&apos;inscription
                  des élèves en tant qu&apos;administrateur de l&apos;École de la
                  Culture et de l&apos;Éducation.
                </p>
              </div>

              <LoginIllustration />
            </aside>

            <section className="order-1 lg:order-2 lg:justify-self-end">
              <div
                aria-busy={isCardBusy}
                className="w-full max-w-[540px] rounded-[28px] border border-[#ede7de] bg-white/95 px-6 py-8 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.3)] backdrop-blur sm:px-9 sm:py-10 lg:px-11 lg:py-11"
              >
                <h2
                  style={serifFontStyle}
                  className="text-[2.55rem] leading-none tracking-[-0.04em] text-primary sm:text-[3.05rem]"
                >
                  Connexion
                </h2>

                {isLoadingAuth ? (
                  <LoginCardState
                    title="Vérification de la session"
                    description="Chargement de votre session administrateur avant l'affichage du formulaire."
                  />
                ) : null}

                {!isLoadingAuth && isAuthenticated ? (
                  <LoginCardState
                    title="Session active"
                    description="Votre session est déjà ouverte. Redirection vers l'application en cours."
                  />
                ) : null}

                {!isLoadingAuth && !isAuthenticated ? (
                  <form className="mt-9" onSubmit={handleSubmit}>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-[1.1rem] font-medium text-slate-700 sm:text-[1.18rem]"
                      >
                        Adresse e-mail
                      </label>
                      <div className="relative mt-3">
                        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                          <EmailIcon />
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          required
                          disabled={isSubmitting}
                          value={email}
                          onChange={(event) => {
                            setEmail(event.target.value);
                            setErrorMessage(null);
                          }}
                          placeholder="Adresse e-mail"
                          className="h-14 w-full rounded-xl border border-[#d6d8d1] bg-white pl-14 pr-4 text-[1.12rem] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label
                        htmlFor="password"
                        className="block text-[1.1rem] font-medium text-slate-700 sm:text-[1.18rem]"
                      >
                        Mot de passe
                      </label>
                      <div className="relative mt-3">
                        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                          <LockIcon />
                        </span>
                        <input
                          id="password"
                          name="password"
                          type={isPasswordVisible ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          disabled={isSubmitting}
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setErrorMessage(null);
                          }}
                          placeholder="Mot de passe"
                          className="h-14 w-full rounded-xl border border-[#d6d8d1] bg-white pl-14 pr-14 text-[1.12rem] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
                        />
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                          className="absolute inset-y-0 right-4 flex items-center text-primary/85 transition hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          aria-label={
                            isPasswordVisible
                              ? "Masquer le mot de passe"
                              : "Afficher le mot de passe"
                          }
                        >
                          {isPasswordVisible ? <EyeIcon /> : <EyeOffIcon />}
                        </button>
                      </div>
                    </div>

                    <p className="mt-4 text-[1.05rem] text-slate-600">
                      Mot de passe oublié ?
                    </p>

                    {errorMessage ? (
                      <p className="mt-4 rounded-xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm leading-6 text-danger">
                        {errorMessage}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-7 inline-flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-secondary to-secondaryDark px-6 text-[1.12rem] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_28px_-22px_rgba(180,132,47,0.9)] transition hover:from-secondaryDark hover:to-secondaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:from-[#dbbc80] disabled:to-[#cfa65f]"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-3">
                          <StatusSpinner className="border-white/35 border-t-white" />
                          Connexion...
                        </span>
                      ) : (
                        "Se connecter"
                      )}
                    </button>
                  </form>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <footer className="flex min-h-[84px] items-center justify-center border-t border-white/60 px-6 py-4 text-center text-[1.05rem] text-slate-600 sm:text-[1.12rem]">
          ECE – École de la Culture et de l&apos;Éducation
        </footer>
      </div>
    </main>
  );
};

export default LoginPage;
