import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@keel/api'
import { registerCompanySchema, type RegisterCompanyInput } from '@keel/validation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterCompanyInput>({
    resolver: zodResolver(registerCompanySchema),
  })

  async function onSubmit(data: RegisterCompanyInput) {
    setServerError(null)
    try {
      await apiClient.post('/api/v1/auth/register', {
        company_name: data.company_name,
        full_name: data.full_name,
        company_number: data.company_number,
        vat_number: data.vat_number,
      })
      navigate('/', { replace: true })
    } catch (err: any) {
      setServerError(err?.response?.data?.detail ?? 'Something went wrong')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="text-2xl font-bold text-keel-900">Welcome to Keel</h1>
        <p className="mt-1 text-sm text-gray-500">Tell us a bit about your business.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <Field label="Your full name" error={errors.full_name?.message}>
            <input {...register('full_name')} placeholder="Jane Smith" />
          </Field>

          <Field label="Company or trading name" error={errors.company_name?.message}>
            <input {...register('company_name')} placeholder="Acme Ltd" />
          </Field>

          <Field label="Companies House number (optional)" error={errors.company_number?.message}>
            <input {...register('company_number')} placeholder="12345678" />
          </Field>

          <Field label="VAT number (optional)" error={errors.vat_number?.message}>
            <input {...register('vat_number')} placeholder="GB123456789" />
          </Field>

          {serverError && (
            <p className="text-sm text-red-600">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-keel-500 py-3 text-sm font-semibold text-white transition hover:bg-keel-900 disabled:opacity-50"
          >
            {isSubmitting ? 'Setting up…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-gray-300 [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:focus:border-keel-500 [&_input]:focus:outline-none">
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
