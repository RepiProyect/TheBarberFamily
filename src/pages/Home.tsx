import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { BarberStripe } from '../components/BarberStripe'

const servicios = [
  { nombre: 'Corte clásico', desc: 'Máquina y tijera, lavado y peinado.', precio: '$25.000', dur: '40 min' },
  { nombre: 'Corte + barba', desc: 'Corte completo y perfilado de barba.', precio: '$35.000', dur: '60 min' },
  { nombre: 'Barba', desc: 'Perfilado, toalla caliente y aceites.', precio: '$15.000', dur: '30 min' },
  { nombre: 'Corte niño', desc: 'Para los más pequeños de la familia.', precio: '$20.000', dur: '30 min' },
  { nombre: 'Diseño / líneas', desc: 'Figuras y líneas personalizadas.', precio: '$30.000', dur: '45 min' },
  { nombre: 'Mascarilla negra', desc: 'Limpieza facial y puntos negros.', precio: '$18.000', dur: '20 min' },
]

const horario = [
  { dia: 'Lunes – Viernes', horas: '9:00 a.m. – 8:00 p.m.' },
  { dia: 'Sábado', horas: '8:00 a.m. – 9:00 p.m.' },
  { dia: 'Domingo', horas: 'Cerrado' },
]

export default function Home() {
  return (
    <div className="min-h-dvh bg-ink text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="#inicio" className="flex items-center gap-3">
            <Logo className="h-11 w-auto" />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a href="#servicios" className="transition hover:text-white">Servicios</a>
            <a href="#horario" className="transition hover:text-white">Horario</a>
            <a href="#ubicacion" className="transition hover:text-white">Ubicación</a>
          </nav>
          <Link
            to="/reservar"
            className="rounded-full bg-red px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-dark"
          >
            Reservar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, rgba(229,9,20,0.20) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center md:py-24">
          <Logo className="h-48 w-auto drop-shadow-[0_8px_30px_rgba(229,9,20,0.25)] md:h-64" />
          <h1 className="mt-8 font-display text-4xl font-bold uppercase italic leading-none tracking-wide md:text-6xl">
            Más que un corte,
            <br />
            <span className="text-red">somos familia.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted md:text-lg">
            Barbería urbana en Neiva. Estilo, técnica y buena atención.
            Reserva tu turno en segundos y recibe la confirmación por WhatsApp.
          </p>
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/reservar"
              className="w-full rounded-full bg-red px-8 py-3 text-base font-semibold text-white transition hover:bg-red-dark sm:w-auto"
            >
              Agenda tu próxima cita
            </Link>
            <a
              href="#servicios"
              className="w-full rounded-full border border-line px-8 py-3 text-base font-semibold text-white transition hover:border-red sm:w-auto"
            >
              Ver servicios
            </a>
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-muted">
            Estilo · Confianza · Familia
          </p>
        </div>
        <BarberStripe />
      </section>

      {/* Servicios */}
      <section id="servicios" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-5xl font-bold uppercase tracking-wide md:text-6xl">Servicios</h2>
          <p className="mt-3 text-muted">Precios de referencia · personalizables desde el panel.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <article
              key={s.nombre}
              className="group rounded-2xl border border-line bg-surface p-6 transition hover:border-red"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-2xl font-semibold uppercase tracking-wide text-white">{s.nombre}</h3>
                <span className="shrink-0 rounded-full bg-ink-2 px-3 py-1 text-sm font-semibold text-red">
                  {s.precio}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{s.desc}</p>
              <p className="mt-4 text-xs uppercase tracking-widest text-muted">{s.dur}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/reservar"
            className="inline-flex rounded-full bg-red px-8 py-3 font-semibold text-white transition hover:bg-red-dark"
          >
            Agendar ahora
          </Link>
        </div>
      </section>

      {/* Horario + Reservar */}
      <section id="horario" className="border-y border-line bg-ink-2">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <h2 className="font-display text-5xl font-bold uppercase tracking-wide md:text-6xl">Horario</h2>
            <ul className="mt-8 divide-y divide-line">
              {horario.map((h) => (
                <li key={h.dia} className="flex items-center justify-between py-4">
                  <span className="text-white">{h.dia}</span>
                  <span className="text-muted">{h.horas}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-start justify-center rounded-2xl border border-line bg-surface p-8">
            <h3 className="font-display text-4xl font-bold uppercase tracking-wide">Agenda tu turno</h3>
            <p className="mt-3 text-muted">
              Elige tu servicio, el día y la hora. Recibirás la confirmación por WhatsApp.
            </p>
            <Link
              to="/reservar"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-red px-7 py-3 font-semibold text-white transition hover:bg-red-dark"
            >
              Reservar turno
            </Link>
          </div>
        </div>
      </section>

      {/* Ubicación / contacto */}
      <section id="ubicacion" className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="font-display text-5xl font-bold uppercase tracking-wide md:text-6xl">Dónde estamos</h2>
        <p className="mt-4 text-lg text-white">Neiva – Huila – Colombia</p>
        <p className="mt-2 text-muted">
          Agrega aquí tu dirección exacta y datos de contacto. Se podrán editar desde el panel.
        </p>
      </section>

      <BarberStripe />

      {/* Footer */}
      <footer className="bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center">
          <Logo className="h-20 w-auto" />
          <p className="font-display text-sm uppercase tracking-[0.3em] text-red">
            Más que un corte, somos familia
          </p>
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} BARBER THE FAMILY · Neiva, Huila · Todos los derechos reservados
          </p>
          <Link to="/panel" className="text-xs text-muted/60 transition hover:text-muted">
            Acceso equipo
          </Link>
        </div>
      </footer>
    </div>
  )
}
