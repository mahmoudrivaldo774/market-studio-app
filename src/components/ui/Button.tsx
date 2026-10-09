import React from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants: Record<string, string> = {
      primary: 'bg-brand-orange text-white hover:bg-brand-orange/90 shadow-sm',
      secondary: 'bg-brand-gold text-white hover:bg-brand-gold/90 shadow-sm',
      outline: 'border-2 border-brand-orange text-brand-orange hover:bg-brand-orange/5',
      ghost: 'text-gray-600 hover:bg-gray-100',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
    }

    const sizes: Record<string, string> = {
      sm: 'h-9 px-3 text-sm rounded-lg',
      md: 'h-11 px-5 text-sm rounded-lg touch-target',
      lg: 'h-14 px-8 text-base rounded-xl touch-target',
      icon: 'h-11 w-11 rounded-lg touch-target'
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-5 w-5 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
