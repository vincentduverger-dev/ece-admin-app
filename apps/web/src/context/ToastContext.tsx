import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error";

export type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  toasts: ToastItem[];
  dismissToast: (toastId: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

const SUCCESS_DURATION_MS = 3000;
const ERROR_DURATION_MS = 5000;

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastIdRef = useRef(0);
  const timeoutIdsRef = useRef<Map<number, number>>(new Map());

  const dismissToast = (toastId: number): void => {
    const timeoutId = timeoutIdsRef.current.get(toastId);

    if (typeof timeoutId === "number") {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(toastId);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId)
    );
  };

  const enqueueToast = (
    type: ToastType,
    message: string,
    duration: number
  ): void => {
    const normalizedMessage = message.trim();

    if (normalizedMessage.length === 0) {
      return;
    }

    nextToastIdRef.current += 1;

    const nextToast: ToastItem = {
      id: nextToastIdRef.current,
      type,
      message: normalizedMessage
    };

    setToasts((currentToasts) => [...currentToasts, nextToast]);

    const timeoutId = window.setTimeout(() => {
      dismissToast(nextToast.id);
    }, duration);

    timeoutIdsRef.current.set(nextToast.id, timeoutId);
  };

  const showSuccess = (message: string): void => {
    enqueueToast("success", message, SUCCESS_DURATION_MS);
  };

  const showError = (message: string): void => {
    enqueueToast("error", message, ERROR_DURATION_MS);
  };

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIdsRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        dismissToast,
        showError,
        showSuccess
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};
