'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_TERMS, type TenantTerms } from '@/lib/terminology/defaults'

export type { TenantTerms } from '@/lib/terminology/defaults'

const TermsContext = createContext<TenantTerms>(DEFAULT_TERMS)

export function TermsProvider({
  terms,
  children,
}: {
  terms: TenantTerms
  children: ReactNode
}) {
  return <TermsContext.Provider value={terms}>{children}</TermsContext.Provider>
}

export function useTerms(): TenantTerms {
  return useContext(TermsContext)
}
