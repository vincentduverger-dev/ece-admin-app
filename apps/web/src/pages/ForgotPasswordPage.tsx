import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  AuthFooter,
  BrandHeader,
  EmailIcon,
  SerifHeading,
  StatusSpinner
} from "../components/auth/AuthPageUi";
import { requestPasswordReset } from "../lib/api";

const SUCCESS_MESSAGE =
  "Si cette adresse correspond à un compte administrateur, un e-mail de réinitialisation a été envoyé.";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await requestPasswordReset(email.trim());
      setSuccessMessage(SUCCESS_MESSAGE);
    } catch {
      setErrorMessage("Impossible d'envoyer la demande pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-background-texture min-h-screen text-slate-900">
      <div className="flex min-h-screen flex-col">
        <BrandHeader />

        <section className="relative flex flex-1 items-center overflow-hidden px-6 py-10 sm:px-10 lg:px-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_34%,rgba(255,255,255,0.86),transparent_32%),radial-gradient(circle_at_72%_26%,rgba(255,255,255,0.68),transparent_28%)]" />
          <div className="relative mx-auto w-full max-w-[540px] rounded-[28px] border border-[#ede7de] bg-white/95 px-6 py-8 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.3)] backdrop-blur sm:px-9 sm:py-10 lg:px-11 lg:py-11">
            <SerifHeading
              className="text-center text-[2.3rem] leading-none tracking-[-0.04em] text-primary sm:text-[2.75rem]"
            >
              Mot de passe oublié
            </SerifHeading>
            <p className="mt-5 text-center text-[1.08rem] leading-7 text-slate-600">
              Saisissez l&apos;adresse e-mail administrateur. Si elle correspond à
              un compte, un lien valable 30 minutes sera envoyé.
            </p>

            <form className="mt-8" onSubmit={handleSubmit}>
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
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  placeholder="Adresse e-mail"
                  className="h-14 w-full rounded-xl border border-[#d6d8d1] bg-white pl-14 pr-4 text-[1.12rem] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary/35 focus:ring-4 focus:ring-primary/10"
                />
              </div>

              {successMessage ? (
                <p className="mt-5 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm leading-6 text-primary">
                  {successMessage}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="mt-5 rounded-xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm leading-6 text-danger">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 inline-flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-secondary to-secondaryDark px-6 text-center text-[1.05rem] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_28px_-22px_rgba(180,132,47,0.9)] transition hover:from-secondaryDark hover:to-secondaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:from-[#dbbc80] disabled:to-[#cfa65f] sm:text-[1.12rem]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <StatusSpinner className="border-white/35 border-t-white" />
                    Envoi...
                  </span>
                ) : (
                  "Envoyer le lien de réinitialisation"
                )}
              </button>
            </form>

            <div className="mt-6 flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[1.05rem] font-medium text-primary transition hover:text-secondaryDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span aria-hidden="true" className="text-[1.35rem] leading-none">
                  ‹
                </span>
                Retour à la connexion
              </Link>
            </div>
          </div>
        </section>

        <AuthFooter />
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
