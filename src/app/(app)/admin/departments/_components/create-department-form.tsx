import { createDepartment } from "@/server/actions/admin-departments"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

interface TenantOption {
  id: string
  slug: string | null
  name: string
}

interface Props {
  readonly isSuper: boolean
  readonly tenants: ReadonlyArray<TenantOption>
  readonly defaultTenantId: string
  readonly fixedTenantId?: string
}

/**
 * Create-department form card. Inputs adapt to role:
 * - SUPER_ADMIN: tenant <select>
 * - HQ_ADMIN: hidden tenantId fixed to session tenant
 */
export function CreateDepartmentForm({
  isSuper,
  tenants,
  defaultTenantId,
  fixedTenantId
}: Props) {
  const fixedTenant = !isSuper && fixedTenantId
    ? tenants.find((t) => t.id === fixedTenantId)
    : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>신규 부서 추가</CardTitle>
        <CardDescription>
          부서 코드는 대문자-숫자 두 자리 형식입니다 (예: CNU-29). 같은 테넌트에서 중복된 코드는 허용되지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={createDepartment}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">
              테넌트
            </span>
            {isSuper ? (
              <select
                name="tenantId"
                required
                defaultValue={defaultTenantId}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
              >
                <option value="">선택</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.slug ? `(${t.slug})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="hidden"
                  name="tenantId"
                  value={fixedTenantId ?? ""}
                />
                <input
                  type="text"
                  disabled
                  value={
                    fixedTenant
                      ? `${fixedTenant.name}${fixedTenant.slug ? ` (${fixedTenant.slug})` : ""}`
                      : (fixedTenantId ?? "")
                  }
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-slate-500"
                />
              </>
            )}
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">
              부서 코드
            </span>
            <input
              name="code"
              type="text"
              required
              placeholder="CNU-29"
              pattern="^[A-Z]+-\d{2}$"
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
            />
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">
              부서명
            </span>
            <input
              name="name"
              type="text"
              required
              maxLength={120}
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="text-sm">
            <span className="block text-slate-600 dark:text-slate-400 mb-1">
              정원 (deviceQuota)
            </span>
            <input
              name="deviceQuota"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              required
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 tabular-nums"
            />
          </label>

          <label className="text-sm flex items-center gap-2 md:col-span-2">
            <input
              name="isHq"
              type="checkbox"
              value="on"
              className="rounded border-slate-300 dark:border-slate-700"
            />
            <span>총괄(HQ) 부서로 지정</span>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              부서 추가
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
