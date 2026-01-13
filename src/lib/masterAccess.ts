// ID da agência master (Senseys - Marketing Imobiliário)
// Esta é a única agência que terá acesso ao Painel de Controle
export const MASTER_AGENCY_ID = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';

/**
 * Verifica se o usuário atual é um administrador da agência master (Senseys)
 * Esta função deve ser usada no frontend para controlar acesso ao Painel de Controle
 * 
 * @param agencyId - ID da agência atual do usuário
 * @param agencyRole - Role do usuário na agência (owner, admin, member)
 * @returns true se o usuário é owner ou admin da agência Senseys
 */
export const isMasterAgencyAdmin = (
  agencyId: string | undefined | null,
  agencyRole: string | undefined | null
): boolean => {
  if (!agencyId || !agencyRole) return false;
  
  return (
    agencyId === MASTER_AGENCY_ID && 
    (agencyRole === 'owner' || agencyRole === 'admin')
  );
};
