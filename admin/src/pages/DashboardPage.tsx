import { useSession } from '@/auth/session'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** Заглушка dashboard за guard'ом. Реальные CRUD-экраны контента — задача 08. */
export default function DashboardPage() {
  const { identity } = useSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold uppercase tracking-wide">Панель управления</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Каркас админки. Управление контентом появится в следующей задаче.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Сессия</CardTitle>
          <CardDescription>Активный редактор</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          Вы вошли как <span className="font-medium">{identity?.sub ?? '—'}</span>.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Контент</CardTitle>
          <CardDescription>Категории · подкатегории · работы</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Раздел</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={2}>
                  Управление контентом появится в задаче 08.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
