import type { UserProfile } from '../services/authService';

export const OFFICIAL_ROLES = [
  'ADMIN',
  'STATE_OFFICIAL',
  'DISTRICT_OFFICIAL',
  'HYDROLOGIST_ANALYST',
  'READ_ONLY_OFFICIAL',
  'admin',
  'state_official',
  'district_official',
  'hydrologist_analyst',
  'read_only_official',
];

/**
 * Returns true if the authenticated user has an authoritative government/official role.
 */
export function isOfficialUser(user: UserProfile | null): boolean {
  if (!user) return false;

  const sysRole = (user.system_role || '').toUpperCase();
  const roleTitle = (user.role || '').toUpperCase();
  const userEmail = (user.email || '').toLowerCase();

  // Strict Farmer exclusions
  if (
    sysRole === 'FARMER' ||
    userEmail === 'farmer@jalkrishi.in' ||
    (roleTitle.includes('FARMER') && !roleTitle.includes('OFFICIAL') && !roleTitle.includes('HYDROLOGIST'))
  ) {
    return false;
  }

  return (
    OFFICIAL_ROLES.includes(sysRole) ||
    OFFICIAL_ROLES.includes(user.system_role || '') ||
    userEmail.includes('@jalkrishi.gov.in') ||
    roleTitle.includes('OFFICIAL') ||
    roleTitle.includes('HYDROLOGIST') ||
    roleTitle.includes('OFFICER') ||
    roleTitle.includes('SCIENTIST') ||
    roleTitle.includes('OBSERVER') ||
    roleTitle.includes('ADMIN')
  );
}

/**
 * Returns true if the session is for a farmer or unauthenticated public visitor.
 */
export function isFarmerUser(user: UserProfile | null): boolean {
  return !isOfficialUser(user);
}

/**
 * Returns the authoritative experience scope: 'official' or 'farmer'.
 */
export function getExperienceScope(user: UserProfile | null): 'official' | 'farmer' {
  return isOfficialUser(user) ? 'official' : 'farmer';
}
