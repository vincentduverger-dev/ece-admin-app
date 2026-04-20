import Toast from "./Toast";
import { useToast } from "../../context/ToastContext";

const ToastViewport = () => {
  const { dismissToast, toasts } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-6 sm:top-6 sm:w-96"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </section>
  );
};

export default ToastViewport;
