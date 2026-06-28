import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

// A single nav link styled as a rounded pill (Linear / Raycast feel): mute by
// default, fills subtly on hover, and gets an orange-accent ring when it's the
// active route.
export function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
    >
      {children}
    </NavLink>
  )
}
