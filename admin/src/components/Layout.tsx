import { useState, type ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

import { useSession } from '@/auth/session'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'

/** Служебный layout админки (десктоп): шапка с именем редактора и выходом + тостер. */
export function Layout({ children }: { children: ReactNode }) {
  const { identity, logout } = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setConfirmOpen(false)
    toast.success('Вы вышли из админки')
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide">
            PROKSION · Админка
          </span>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {identity && <span>{identity.sub}</span>}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LogOut />
                  Выйти
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Выйти из админки?</DialogTitle>
                  <DialogDescription>Текущая сессия будет завершена.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Отмена</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleLogout}>
                    Выйти
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
      <Toaster />
    </div>
  )
}
