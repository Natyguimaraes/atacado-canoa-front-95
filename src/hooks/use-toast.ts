import * as React from "react"
import { toast as sonnerToast } from "sonner"

// Interface para compatibilidade com o código existente
interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | string
  duration?: number
}

// Tipo para aceitar tanto string quanto objeto
type ToastInput = string | ToastOptions

// Função de toast que funciona tanto como função quanto como objeto
const toast = Object.assign(
  // Função principal (para compatibilidade com chamadas diretas)
  (input: ToastInput, options?: ToastOptions) => {
    if (typeof input === 'string') {
      sonnerToast(input, {
        description: options?.description,
      })
    } else {
      // Formato objeto (compatibilidade com código antigo)
      const message = input.title || input.description || ''
      if (input.variant === 'destructive') {
        sonnerToast.error(message, {
          description: input.description !== message ? input.description : undefined,
        })
      } else {
        sonnerToast(message, {
          description: input.description !== message ? input.description : undefined,
        })
      }
    }
  },
  // Métodos específicos
  {
    success: (message: string, options?: ToastOptions) => {
      sonnerToast.success(message, {
        description: options?.description,
      })
    },
    error: (message: string, options?: ToastOptions) => {
      sonnerToast.error(message, {
        description: options?.description,
      })
    },
    info: (message: string, options?: ToastOptions) => {
      sonnerToast.info(message, {
        description: options?.description,
      })
    },
    warning: (message: string, options?: ToastOptions) => {
      sonnerToast.warning(message, {
        description: options?.description,
      })
    },
  }
)

function useToast() {
  return {
    toast,
    toasts: [], // Para compatibilidade com componentes que esperam toasts array
  }
}

export { useToast, toast }
