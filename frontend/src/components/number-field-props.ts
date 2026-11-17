import type { InputHTMLAttributes } from 'react'

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'step'> & {
  value?: number | string | null
  decimal?: boolean
  fit?: boolean
  step?: number
}
export type NumberFieldProps = BaseProps &
  (
    | { nullable?: false; onChange: (value: number) => void }
    | { nullable: true; onChange: (value: number | null) => void }
  )
