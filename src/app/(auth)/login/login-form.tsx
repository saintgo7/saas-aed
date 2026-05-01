"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestMagicLink } from "@/server/actions/auth"

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await requestMagicLink(formData)
      } catch (err) {
        if (err instanceof Error && err.message !== "NEXT_REDIRECT") {
          setError(err.message)
        }
      }
    })
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          이메일 주소
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="text-sm text-danger-600 dark:text-danger-500"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={isPending}>
        로그인 링크 받기
      </Button>
    </form>
  )
}
