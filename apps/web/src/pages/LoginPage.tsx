import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  AuthFooter,
  BrandHeader,
  EmailIcon,
  LockIcon,
  SerifHeading,
  StatusSpinner
} from "../components/auth/AuthPageUi";
import { SchoolLoginIllustration } from "../components/animations";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../hooks/useAuth";

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
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
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
    <main className="app-background-texture min-h-screen text-slate-900">
      <div className="flex min-h-screen flex-col">
        <BrandHeader />

        <section className="relative flex flex-1 items-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_34%,rgba(255,255,255,0.86),transparent_32%),radial-gradient(circle_at_72%_26%,rgba(255,255,255,0.68),transparent_28%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(255,255,255,0.78),transparent)]" />

          <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-10 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(470px,540px)] lg:gap-16 lg:px-14 lg:py-12">
            <aside className="order-2 flex flex-col justify-center self-center lg:order-1 lg:pr-4">
              <div className="max-w-[650px]">
                <SerifHeading
                  className="text-[2.45rem] leading-[1.05] tracking-[-0.04em] text-primary sm:text-[2.8rem] lg:text-[3.15rem]"
                >
                  Connexion administrateur
                </SerifHeading>
                <p className="mt-7 max-w-[540px] text-[1.18rem] leading-[2.05rem] text-slate-600 sm:text-[1.34rem] sm:leading-[2.35rem]">
                  Accédez à votre espace de gestion des demandes d&apos;inscription
                  des élèves en tant qu&apos;administrateur de l&apos;Académie Horizon.
                </p>
              </div>

              <div className="relative mt-8 w-full max-w-[560px] lg:mt-10">
                <SchoolLoginIllustration className="mx-auto h-auto max-w-[500px]" />
              </div>
            </aside>

            <section className="order-1 lg:order-2 lg:justify-self-end">
              <div
                aria-busy={isCardBusy}
                className="w-full max-w-[540px] rounded-[28px] border border-[#ede7de] bg-white/95 px-6 py-8 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.3)] backdrop-blur sm:px-9 sm:py-10 lg:px-11 lg:py-11"
              >
                <SerifHeading
                  level={2}
                  className="text-[2.55rem] leading-none tracking-[-0.04em] text-primary sm:text-[3.05rem]"
                >
                  Connexion
                </SerifHeading>

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

                    <p className="mt-4">
                      <Link
                        to="/forgot-password"
                        className="text-[1.05rem] font-medium text-primary transition hover:text-secondaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Mot de passe oublié ?
                      </Link>
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

        <AuthFooter />
      </div>
    </main>
  );
};

export default LoginPage;
