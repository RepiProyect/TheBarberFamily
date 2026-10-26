type Props = { className?: string }

/** Logo oficial de BARBER THE FAMILY. */
export function Logo({ className }: Props) {
  return (
    <img
      src="/logo.png"
      alt="BARBER THE FAMILY"
      className={className}
      draggable={false}
    />
  )
}
