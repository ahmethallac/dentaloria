import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, UserPlus, Trash2, Search, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { displayRoleName, type AppRole } from '@/lib/roleService'
import { useAuth } from '@/contexts/AuthContext'

interface ManagedUser {
  id: string
  email: string
  full_name: string | null
  created_at: string
  roles: AppRole[]
}

export default function UsersManager() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Create form — always creates Super Admin
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { action: 'list_users' },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setUsers(data?.users || [])
    } catch (e: any) {
      toast({ title: t('usersManager.toasts.loadErrorTitle'), description: e.message || t('usersManager.toasts.loadErrorDesc'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.full_name) {
      toast({ title: t('usersManager.toasts.missingFieldsTitle'), description: t('usersManager.toasts.missingFieldsDesc'), variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email: form.email, password: form.password, full_name: form.full_name },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast({ title: t('usersManager.toasts.createdTitle'), description: t('usersManager.toasts.createdDesc', { email: form.email }) })
      setForm({ email: '', full_name: '', password: '' })
      load()
    } catch (e: any) {
      toast({ title: t('usersManager.toasts.errorTitle'), description: e.message || t('usersManager.toasts.createErrorDesc'), variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(t('usersManager.toasts.confirmDelete', { email }))) return
    setUpdatingId(userId)
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { action: 'delete_user', user_id: userId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast({ title: t('usersManager.toasts.deletedTitle') })
      load()
    } catch (e: any) {
      toast({ title: t('usersManager.toasts.errorTitle'), description: e.message, variant: 'destructive' })
    } finally {
      setUpdatingId(null)
    }
  }

  // Show only Super Admins. Clinic admins, patients, etc. are excluded.
  const superAdmins = users.filter(u => (u.roles || []).includes('admin'))

  const filtered = superAdmins.filter(u => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" /> {t('usersManager.aboutTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <Badge variant="destructive" className="mr-2">{t('usersManager.aboutBadge')}</Badge>
            {t('usersManager.aboutDesc1')}
          </p>
          <p>
            {t('usersManager.aboutDesc2Prefix')} <strong>{t('usersManager.aboutDesc2Bold')}</strong> {t('usersManager.aboutDesc2Suffix')}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t('usersManager.tabAll', { count: filtered.length })}</TabsTrigger>
          <TabsTrigger value="create">{t('usersManager.tabCreate')}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('usersManager.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('usersManager.refresh')}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('usersManager.tableName')}</TableHead>
                  <TableHead>{t('usersManager.tableEmail')}</TableHead>
                  <TableHead>{t('usersManager.tableRole')}</TableHead>
                  <TableHead>{t('usersManager.tableCreated')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('usersManager.tableActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t('usersManager.noneFound')}</TableCell></TableRow>
                ) : (
                  filtered.map(u => {
                    const isSelf = currentUser?.id === u.id
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{displayRoleName('admin')}</Badge>
                          {isSelf && <Badge variant="outline" className="ml-2 text-[10px]">{t('usersManager.youBadge')}</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={updatingId === u.id || isSelf}
                            onClick={() => handleDelete(u.id, u.email)}
                            title={isSelf ? t('usersManager.cantDeleteSelf') : t('usersManager.deleteUser')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{t('usersManager.createTitle')}</CardTitle>
              <CardDescription>{t('usersManager.createDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('usersManager.fullNameLabel')}</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder={t('usersManager.fullNamePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('usersManager.emailLabel')}</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={t('usersManager.emailPlaceholder')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('usersManager.passwordLabel')}</Label>
                <Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('usersManager.passwordPlaceholder')} />
              </div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {t('usersManager.createButton')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
