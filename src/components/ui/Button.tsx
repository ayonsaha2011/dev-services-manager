import { Component, JSX, splitProps } from 'solid-js'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background btn-interactive backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-primary/95 text-primary-foreground hover:bg-primary shadow-sm hover:shadow-md",
        destructive: "bg-destructive/95 text-destructive-foreground hover:bg-destructive shadow-sm hover:shadow-md",
        outline: "border border-input/60 bg-background/95 hover:bg-accent/80 hover:text-accent-foreground shadow-sm hover:shadow-md",
        secondary: "bg-secondary/95 text-secondary-foreground hover:bg-secondary shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground backdrop-blur-sm",
        link: "underline-offset-4 hover:underline text-primary",
        success: "bg-primary/95 text-primary-foreground hover:bg-primary shadow-sm hover:shadow-md",
        warning: "bg-warning/95 text-warning-foreground hover:bg-warning shadow-sm hover:shadow-md",
        info: "bg-info/95 text-info-foreground hover:bg-info shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-8 px-3 rounded-md text-xs",
        lg: "h-12 px-8 rounded-lg text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, ['variant', 'size', 'class', 'children', 'loading'])
  
  return (
    <button
      class={clsx(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      disabled={local.loading || others.disabled}
      {...others}
    >
      {local.children}
    </button>
  )
}

export default Button