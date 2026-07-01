import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { useSession } from '@/auth/session'
import { loginSchema, type LoginValues } from '@/auth/validation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

/** Сообщение об ошибке логина по статусу ответа бэка (контракт задачи 05). */
function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return 'Слишком много попыток. Попробуйте позже.'
    if (err.status === 401) return 'Неверный пароль'
  }
  return 'Не удалось войти. Попробуйте ещё раз.'
}

export default function LoginPage() {
  const { login, status } = useSession()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
  })

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null)
    try {
      await login(values.password)
      navigate('/', { replace: true })
    } catch (err) {
      setSubmitError(loginErrorMessage(err))
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="uppercase tracking-wide">PROKSION · Админка</CardTitle>
          <CardDescription>Вход для редактора портфолио</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {submitError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {submitError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                Войти
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
