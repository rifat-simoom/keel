import { Snowflake, Wifi } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { VirtualCard } from '@keel/types'
import { useFreezeCard } from '../../hooks/useBanking'

interface VirtualCardPanelProps {
  card: VirtualCard
}

export function VirtualCardPanel({ card }: VirtualCardPanelProps) {
  const freeze = useFreezeCard()
  const isFrozen = card.status === 'frozen'

  function handleToggle() {
    freeze.mutate(isFrozen ? 'unfreeze' : 'freeze')
  }

  const expiryStr = `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}`

  return (
    <div className="space-y-4">
      {/* Card visual */}
      <div
        className={cn(
          'relative h-48 w-full max-w-sm overflow-hidden rounded-2xl p-6 shadow-lg transition-all duration-300',
          isFrozen
            ? 'bg-gradient-to-br from-gray-400 to-gray-600'
            : 'bg-gradient-to-br from-keel-500 to-keel-800',
        )}
      >
        {/* Frozen overlay */}
        {isFrozen && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-white">
              <Snowflake size={32} />
              <p className="text-sm font-semibold">Card frozen</p>
            </div>
          </div>
        )}

        {/* Card content */}
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-lg font-bold tracking-widest text-white/90">KEEL</span>
            <Wifi size={20} className="rotate-90 text-white/70" />
          </div>

          <div>
            <p className="font-mono text-xl font-semibold tracking-widest text-white">
              •••• •••• •••• {card.last_four}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">VALID THRU</p>
                <p className="font-mono text-sm font-medium text-white">{expiryStr}</p>
              </div>
              <p className="text-sm font-medium uppercase tracking-wide text-white/80">
                Business Debit
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Freeze toggle */}
      <button
        onClick={handleToggle}
        disabled={freeze.isPending || card.status === 'cancelled'}
        className={cn(
          'flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors',
          isFrozen
            ? 'border-keel-300 bg-keel-50 text-keel-700 hover:bg-keel-100'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
          (freeze.isPending || card.status === 'cancelled') && 'cursor-not-allowed opacity-50',
        )}
      >
        <Snowflake size={16} />
        {freeze.isPending
          ? 'Updating…'
          : isFrozen
            ? 'Unfreeze card'
            : 'Freeze card'}
      </button>

      {card.status === 'cancelled' && (
        <p className="text-center text-xs text-red-500">This card has been cancelled</p>
      )}
    </div>
  )
}
