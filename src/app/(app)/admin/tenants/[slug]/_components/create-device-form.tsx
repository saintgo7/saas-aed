import { createDevice } from "@/server/actions/admin-devices"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

interface DepartmentOption {
  id: string
  code: string
  name: string
}

interface Props {
  readonly tenantId: string
  readonly departments: ReadonlyArray<DepartmentOption>
}

/**
 * Create-device form card for the tenant detail page.
 * Rendered server-side; submits via Server Action (no client JS).
 */
export function CreateDeviceForm({ tenantId, departments }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>장비 추가</CardTitle>
        <CardDescription>
          장비 코드는 대문자-숫자 세 자리 형식입니다 (예: CNU-001). 같은 테넌트에서 시리얼번호는 중복될 수 없습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={createDevice}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
        >
          <input type="hidden" name="tenantId" value={tenantId} />

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">장비 코드 (선택)</span>
            <input
              name="code"
              type="text"
              placeholder="CNU-001"
              pattern="^[A-Z]+-\d{3}$"
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">부서 (선택)</span>
            <select
              name="departmentId"
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            >
              <option value="">— 미지정 —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} · {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">제조사 *</span>
            <input
              name="manufacturer"
              type="text"
              required
              maxLength={120}
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">모델명 *</span>
            <input
              name="model"
              type="text"
              required
              maxLength={120}
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">시리얼번호 *</span>
            <input
              name="serial"
              type="text"
              required
              maxLength={120}
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">위치 *</span>
            <input
              name="location"
              type="text"
              required
              maxLength={255}
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">상세 위치</span>
            <input
              name="locationDetail"
              type="text"
              maxLength={255}
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">제조일 *</span>
            <input
              name="manufacturedAt"
              type="date"
              required
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">구입일 *</span>
            <input
              name="purchasedAt"
              type="date"
              required
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">유효기한 *</span>
            <input
              name="expiresAt"
              type="date"
              required
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">패드 교체일 *</span>
            <input
              name="padReplaceAt"
              type="date"
              required
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-600 dark:text-slate-400">배터리 교체일 *</span>
            <input
              name="batteryReplaceAt"
              type="date"
              required
              className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              장비 추가
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
