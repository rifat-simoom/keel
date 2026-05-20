import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useExchangeBankCode } from '../hooks/useBanking'

export function BankingCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const exchange = useExchangeBankCode()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const code = params.get('code')
    const error = params.get('error')

    if (error || !code) {
      navigate('/transactions?bank_error=' + encodeURIComponent(error ?? 'no_code'), { replace: true })
      return
    }

    exchange.mutate(code, {
      onSuccess: (result) => {
        const msg = result.new_transactions
          ? `bank_connected=true&new_txns=${result.new_transactions}`
          : 'bank_connected=true'
        navigate(`/transactions?${msg}`, { replace: true })
      },
      onError: () => {
        navigate('/transactions?bank_error=exchange_failed', { replace: true })
      },
    })
  }, [])

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-keel-200 border-t-keel-600" />
        <p className="text-sm font-medium text-slate-700">Connecting your bank…</p>
        <p className="mt-1 text-xs text-slate-400">This will only take a moment</p>
      </div>
    </div>
  )
}
