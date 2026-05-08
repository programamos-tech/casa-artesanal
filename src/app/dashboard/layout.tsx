import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reportes · La Casa Artesanal',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
