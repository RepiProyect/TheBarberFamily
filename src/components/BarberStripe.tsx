/** Franja diagonal roja sobre negro (acento de marca). */
export function BarberStripe() {
  return (
    <div
      aria-hidden
      className="h-1.5 w-full"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, var(--color-red) 0 14px, var(--color-ink) 14px 28px)',
      }}
    />
  )
}
