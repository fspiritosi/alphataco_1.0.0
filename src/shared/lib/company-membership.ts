export type CompanyAccessInput = {
  profileId: string;
  company: { owner_id: string | null } | null;
  membership: { is_active: boolean } | null;
};

/**
 * Regla pura de pertenencia a una empresa: el profile puede operar sobre la
 * empresa si es su owner (`company.owner_id`) o si tiene una fila activa en
 * `share_company_users`. Cualquier otro caso (empresa inexistente, sin
 * membership o membership inactiva) se rechaza.
 */
export function canAccessCompany({ profileId, company, membership }: CompanyAccessInput): boolean {
  if (company?.owner_id === profileId) return true;
  return membership?.is_active === true;
}
