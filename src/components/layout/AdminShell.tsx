import { ReactNode } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { LucideIcon, LogOut, ExternalLink, ChevronRight } from 'lucide-react'
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger,
  SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { displayRoleName, roleBadgeVariant } from '@/lib/roleService'
import { cn } from '@/lib/utils'

export interface ShellNavItem {
  id: string
  label: string
  icon: LucideIcon
  /** Either provide `to` (router NavLink) or `onClick` (button). */
  to?: string
  onClick?: () => void
  badge?: number
  active?: boolean
  hidden?: boolean
}

export interface ShellSection {
  label?: string
  items: ShellNavItem[]
}

interface AdminShellProps {
  brand?: string
  sections: ShellSection[]
  title: string
  breadcrumbs?: { label: string; to?: string }[]
  headerExtra?: ReactNode
  children: ReactNode
}

export function AdminShell({
  brand = 'Dentaloria',
  sections,
  title,
  breadcrumbs = [],
  headerExtra,
  children,
}: AdminShellProps) {
  const navigate = useNavigate()
  const { userRole, profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar collapsible="icon" className="border-r border-slate-800">
          <SidebarHeader className="bg-slate-900 text-slate-100 border-b border-slate-800">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-2 py-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
                D
              </div>
              <span className="font-bold text-base group-data-[collapsible=icon]:hidden">
                {brand}
              </span>
            </button>
          </SidebarHeader>

          <SidebarContent className="bg-slate-900 text-slate-100">
            {sections.map((section, idx) => (
              <SidebarGroup key={idx}>
                {section.label && (
                  <SidebarGroupLabel className="text-slate-400 uppercase text-[10px] tracking-wider">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.filter(i => !i.hidden).map(item => {
                      const Inner = (
                        <>
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          {item.badge != null && item.badge > 0 && (
                            <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 bg-slate-700 text-slate-100 border-0">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )
                      return (
                        <SidebarMenuItem key={item.id}>
                          {item.to ? (
                            <SidebarMenuButton
                              asChild
                              isActive={item.active}
                              tooltip={item.label}
                              className={cn(
                                "text-slate-300 hover:bg-slate-800 hover:text-white",
                                "data-[active=true]:bg-primary/15 data-[active=true]:text-white data-[active=true]:border-l-2 data-[active=true]:border-primary"
                              )}
                            >
                              <NavLink to={item.to} end>
                                {Inner}
                              </NavLink>
                            </SidebarMenuButton>
                          ) : (
                            <SidebarMenuButton
                              onClick={item.onClick}
                              isActive={item.active}
                              tooltip={item.label}
                              className={cn(
                                "text-slate-300 hover:bg-slate-800 hover:text-white",
                                "data-[active=true]:bg-primary/15 data-[active=true]:text-white data-[active=true]:border-l-2 data-[active=true]:border-primary"
                              )}
                            >
                              {Inner}
                            </SidebarMenuButton>
                          )}
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="bg-slate-900 text-slate-100 border-t border-slate-800">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/')}
                  tooltip="Back to site"
                  className="text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Back to site</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  tooltip="Sign out"
                  className="text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1" />
            {headerExtra}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {profile?.full_name || 'Account'}
              </span>
              <Badge variant={roleBadgeVariant(userRole)} className="text-xs">
                {displayRoleName(userRole)}
              </Badge>
            </div>
          </header>

          {/* Page header */}
          <div className="border-b bg-card px-6 py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {breadcrumbs.map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                      {b.to ? (
                        <button onClick={() => navigate(b.to!)} className="hover:text-foreground transition-colors">
                          {b.label}
                        </button>
                      ) : (
                        <span className={cn(i === breadcrumbs.length - 1 && "text-foreground font-medium")}>
                          {b.label}
                        </span>
                      )}
                    </div>
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default AdminShell
