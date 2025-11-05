'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  children: ReactNode
}

export default function MobileButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: MobileButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'border transition-all duration-200',
    'touch-manipulation',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
    'active:scale-95',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  ]

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-3 text-sm min-h-[44px]',
    lg: 'px-6 py-4 text-base min-h-[48px]'
  }

  const variantClasses = {
    primary: [
      'bg-blue-600 text-white border-blue-500',
      'hover:bg-blue-700 hover:border-blue-600',
      'active:bg-blue-800',
      'focus:ring-blue-500',
      'shadow-lg hover:shadow-blue-500/20'
    ],
    secondary: [
      'bg-slate-700 text-white border-slate-600',
      'hover:bg-slate-600 hover:border-slate-500',
      'active:bg-slate-800',
      'focus:ring-slate-500',
      'shadow-lg hover:shadow-slate-500/20'
    ],
    danger: [
      'bg-red-600 text-white border-red-500',
      'hover:bg-red-700 hover:border-red-600',
      'active:bg-red-800',
      'focus:ring-red-500',
      'shadow-lg hover:shadow-red-500/20'
    ],
    success: [
      'bg-green-600 text-white border-green-500',
      'hover:bg-green-700 hover:border-green-600',
      'active:bg-green-800',
      'focus:ring-green-500',
      'shadow-lg hover:shadow-green-500/20'
    ],
    warning: [
      'bg-yellow-600 text-white border-yellow-500',
      'hover:bg-yellow-700 hover:border-yellow-600',
      'active:bg-yellow-800',
      'focus:ring-yellow-500',
      'shadow-lg hover:shadow-yellow-500/20'
    ]
  }

  const widthClasses = fullWidth ? 'w-full' : ''

  const classes = [
    ...baseClasses,
    sizeClasses[size],
    ...variantClasses[variant],
    widthClasses,
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

// Mobile-optimized floating action button
interface MobileFABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  size?: 'md' | 'lg'
  children: ReactNode
}

export function MobileFAB({
  position = 'bottom-right',
  size = 'md',
  className = '',
  children,
  ...props
}: MobileFABProps) {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'bottom-center': 'fixed bottom-6 left-1/2 transform -translate-x-1/2'
  }

  const sizeClasses = {
    md: 'w-14 h-14',
    lg: 'w-16 h-16'
  }

  const classes = [
    'inline-flex items-center justify-center',
    'bg-blue-600 text-white',
    'rounded-full shadow-lg',
    'hover:bg-blue-700 active:bg-blue-800',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
    'transition-all duration-200',
    'touch-manipulation active:scale-95',
    'z-50',
    positionClasses[position],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
