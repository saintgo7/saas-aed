import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"

export default function CheckEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          이메일을 확인하세요
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          입력하신 이메일 주소로 로그인 링크를 보냈습니다.
          <br />
          메일함을 확인하고 링크를 클릭해 주세요.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-left text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <p>
          메일이 도착하지 않나요? 스팸 폴더를 확인하시거나, 잠시 후 다시
          시도해 주세요. 이메일 링크는 24시간 동안 유효합니다.
        </p>
      </div>

      <Link href="/login" className="inline-block w-full">
        <Button variant="outline" size="lg" fullWidth>
          다시 시도
        </Button>
      </Link>
    </div>
  )
}
