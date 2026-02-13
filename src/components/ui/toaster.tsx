import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { Copy } from "lucide-react";
import React from "react";

export function Toaster() {
  const { toasts } = useToast();

  const handleCopy = (title?: React.ReactNode, description?: React.ReactNode) => {
    const text = [title, description].filter(Boolean).join(": ");
    if (text) navigator.clipboard.writeText(String(text));
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            <button
              onClick={() => handleCopy(title, description)}
              className="shrink-0 p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy error"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
