import { Building2, RefreshCw, Unplug, CheckCircle2 } from 'lucide-react'
import { useBankConnection, useConnectBankUrl, useSyncBank, useDisconnectBank } from '../../hooks/useBanking'
import type { BankConnectionStatus } from '@keel/types'

interface Props {
  onConnected?: () => void
}

export function ConnectBankBanner({ onConnected }: Props) {
  const { data: connection, isLoading } = useBankConnection()
  const connectUrl = useConnectBankUrl()
  const sync = useSyncBank()
  const disconnect = useDisconnectBank()

  if (isLoading) return null

  if (!connection?.connected) {
    return <DisconnectedBanner onConnect={() => {
      connectUrl.mutate(undefined, {
        onSuccess: ({ url }) => { window.location.href = url },
      })
    }} loading={connectUrl.isPending} />
  }

  return (
    <ConnectedBanner
      connection={connection}
      onSync={() => sync.mutate()}
      onDisconnect={() => {
        if (confirm('Disconnect your bank? Existing transactions will remain.')) {
          disconnect.mutate()
        }
      }}
      syncing={sync.isPending}
      disconnecting={disconnect.isPending}
      newTxns={sync.data?.new_transactions}
    />
  )
}

function DisconnectedBanner({ onConnect, loading }: { onConnect: () => void; loading: boolean }) {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-keel-100 bg-keel-50 px-5 py-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-keel-100">
        <Building2 size={20} className="text-keel-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">Connect your bank account</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Link your business bank to automatically import transactions via Open Banking.
        </p>
      </div>
      <button
        onClick={onConnect}
        disabled={loading}
        className="flex-shrink-0 rounded-xl bg-keel-600 px-4 py-2 text-sm font-semibold text-white hover:bg-keel-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Redirecting…' : 'Connect bank'}
      </button>
    </div>
  )
}

function ConnectedBanner({
  connection,
  onSync,
  onDisconnect,
  syncing,
  disconnecting,
  newTxns,
}: {
  connection: BankConnectionStatus
  onSync: () => void
  onDisconnect: () => void
  syncing: boolean
  disconnecting: boolean
  newTxns?: number
}) {
  const lastSynced = connection.last_synced_at
    ? new Date(connection.last_synced_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-green-100 bg-green-50 px-5 py-3">
      <CheckCircle2 size={18} className="flex-shrink-0 text-green-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {connection.provider_name ?? 'Bank'} connected
          {connection.display_name && (
            <span className="ml-1 text-slate-500">· {connection.display_name}</span>
          )}
        </p>
        {newTxns != null && newTxns > 0 && (
          <p className="text-xs text-green-700 mt-0.5">{newTxns} new transaction{newTxns !== 1 ? 's' : ''} imported</p>
        )}
        {lastSynced && !newTxns && (
          <p className="text-xs text-slate-400 mt-0.5">Last synced {lastSynced}</p>
        )}
      </div>
      <button
        onClick={onSync}
        disabled={syncing || disconnecting}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
      <button
        onClick={onDisconnect}
        disabled={syncing || disconnecting}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
      >
        <Unplug size={12} />
        Disconnect
      </button>
    </div>
  )
}
