import 'server-only'
import { revalidateTag } from 'next/cache'

export function revalidateTenantResolution(subdomain: string) {
  revalidateTag(`tenant-resolve:${subdomain}`, 'default')
}
