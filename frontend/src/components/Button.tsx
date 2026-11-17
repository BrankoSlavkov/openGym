import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Icon from './Icon.tsx'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string
  size?: string
  icon?: string
  trailingIcon?: string
  children?: ReactNode
}

export default function Button({
  variant = 'plain',
  size,
  icon,
  trailingIcon,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button className={`btn ${variant}${size ? ' ' + size : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children && <span>{children}</span>}
      {trailingIcon && <Icon name={trailingIcon} />}
    </button>
  )
}
