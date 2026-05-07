import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { inviteUser } from "@/server/actions/admin-users"

interface TenantOption {
  id: string
  slug: string | null
  name: string
}

interface DepartmentOption {
  id: string
  tenantId: string
  code: string
  name: string
}

interface RoleOption {
  value: string
  label: string
}

interface Props {
  tenants: ReadonlyArray<TenantOption>
  departments: ReadonlyArray<DepartmentOption>
  roleOptions: ReadonlyArray<RoleOption>
}

/**
 * Server-rendered "사용자 초대" form. Lives in its own file to keep
 * /admin/users/page.tsx under the 400-line guideline.
 */
export function InviteUserForm({ tenants, departments, roleOptions }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>사용자 초대</CardTitle>
        <CardDescription>
          초대된 사용자는 즉시 Magic Link로 로그인할 수 있도록 이메일 인증 처리됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={inviteUser} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wide text-slate-500">
              소속
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-400 mb-1">
                  테넌트
                </span>
                <select
                  name="tenantId"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                >
                  <option value="">선택</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.slug ? `(${t.slug})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-400 mb-1">
                  부서 (선택)
                </span>
                <select
                  name="departmentId"
                  defaultValue="__none__"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                >
                  <option value="__none__">— 미지정 —</option>
                  {departments.map((d) => {
                    const tenant = tenants.find((t) => t.id === d.tenantId)
                    const tag = tenant?.slug ?? tenant?.name ?? "?"
                    return (
                      <option key={d.id} value={d.id}>
                        [{tag}] {d.code} · {d.name}
                      </option>
                    )
                  })}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-wide text-slate-500">
              계정
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-400 mb-1">
                  이메일
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-400 mb-1">
                  이름
                </span>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                />
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-400 mb-1">
                  역할
                </span>
                <select
                  name="role"
                  required
                  defaultValue="INSPECTOR"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-slate-600 dark:text-slate-400 mb-1">
                  전화 (선택)
                </span>
                <input
                  name="phone"
                  type="tel"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                />
              </label>
            </div>
          </fieldset>

          <div>
            <button
              type="submit"
              className="rounded bg-brand-700 text-white px-4 py-2 text-sm font-medium hover:bg-brand-800"
            >
              초대하기
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
