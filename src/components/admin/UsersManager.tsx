import { useEffect, useState } from 'react'
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
      toast({ title: 'Error', description: e.message || 'Failed to load users', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.full_name) {
      toast({ title: 'Missing fields', description: 'Email, full name and password are required.', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email: form.email, password: form.password, full_name: form.full_name },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast({ title: 'Super Admin created', description: `${form.email} can now sign in.` })
      setForm({ email: '', full_name: '', password: '' })
      load()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to create user', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return
    setUpdatingId(userId)
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user-role', {
        body: { action: 'delete_user', user_id: userId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast({ title: 'User deleted' })
      load()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
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
            <Shield className="w-4 h-4" /> About Super Admins
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <Badge variant="destructive" className="mr-2">Super Admin</Badge>
            Has full access to the platform: manages all clinics, approvals, billing, and other Super Admins.
          </p>
          <p>
            Clinics are <strong>not</strong> managed here. Each clinic owner registers their own account and is given Clinic Admin access automatically — they manage their own clinic from their own panel.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Super Admins ({filtered.length})</TabsTrigger>
          <TabsTrigger value="create">Create Super Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No Super Admins found.</TableCell></TableRow>
                ) : (
                  filtered.map(u => {
                    const isSelf = currentUser?.id === u.id
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{displayRoleName('admin')}</Badge>
                          {isSelf && <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>}
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
                            title={isSelf ? "You can't delete yourself" : 'Delete user'}
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
              <CardTitle>Create new Super Admin</CardTitle>
              <CardDescription>The account is created and can sign in immediately. Only Super Admin accounts can be created here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Temporary password</Label>
                <Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" />
              </div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Create Super Admin
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
