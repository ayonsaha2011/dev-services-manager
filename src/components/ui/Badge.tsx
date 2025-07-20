import { Component, JSX, splitProps } from 'solid-js'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/95 text-primary-foreground",
        secondary: "border-transparent bg-secondary/95 text-secondary-foreground",
        destructive: "border-transparent bg-destructive/95 text-destructive-foreground",
        outline: "text-foreground border-border/60 bg-background/95",
        success: "border-transparent bg-primary/95 text-primary-foreground",
        warning: "border-transparent bg-warning/95 text-warning-foreground",
        info: "border-transparent bg-info/95 text-info-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps extends JSX.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge: Component<BadgeProps> = (props) => {
  const [local, others] = splitProps(props, ['variant', 'class', 'children'])
  
  return (
    <div
      class={clsx(badgeVariants({ variant: local.variant }), local.class)}
      {...others}
    >
      {local.children}
    </div>
  )
}

export default Badge 