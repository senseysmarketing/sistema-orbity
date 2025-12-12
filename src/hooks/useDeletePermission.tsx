import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';

interface DeletePermissionResult {
  canDelete: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  loading: boolean;
  creatorName: string;
}

export function useDeletePermission(createdBy: string | null | undefined) {
  const { user } = useAuth();
  const { isAgencyAdmin } = useAgency();
  const [result, setResult] = useState<DeletePermissionResult>({
    canDelete: false,
    isCreator: false,
    isAdmin: false,
    loading: true,
    creatorName: '',
  });

  useEffect(() => {
    const checkPermission = async () => {
      if (!user?.id || !createdBy) {
        setResult({
          canDelete: false,
          isCreator: false,
          isAdmin: false,
          loading: false,
          creatorName: '',
        });
        return;
      }

      const isCreator = user.id === createdBy;
      const isAdmin = isAgencyAdmin();

      // Buscar nome do criador se não for o próprio usuário
      let creatorName = '';
      if (!isCreator) {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', createdBy)
          .single();
        
        creatorName = creatorProfile?.name || 'Usuário desconhecido';
      }

      setResult({
        canDelete: isCreator || isAdmin,
        isCreator,
        isAdmin,
        loading: false,
        creatorName,
      });
    };

    checkPermission();
  }, [user?.id, createdBy, isAgencyAdmin]);

  return result;
}
