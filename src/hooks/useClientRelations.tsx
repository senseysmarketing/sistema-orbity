import { supabase } from "@/integrations/supabase/client";

type RelationType = "task" | "post" | "meeting";

export const useClientRelations = () => {
  const fetchClientIds = async (type: RelationType, entityId: string): Promise<string[]> => {
    let data: { client_id: string }[] | null = null;
    let error: any = null;

    if (type === "task") {
      const result = await supabase
        .from("task_clients")
        .select("client_id")
        .eq("task_id", entityId);
      data = result.data;
      error = result.error;
    } else if (type === "post") {
      const result = await supabase
        .from("post_clients")
        .select("client_id")
        .eq("post_id", entityId);
      data = result.data;
      error = result.error;
    } else if (type === "meeting") {
      const result = await supabase
        .from("meeting_clients")
        .select("client_id")
        .eq("meeting_id", entityId);
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error(`Error fetching ${type} clients:`, error);
      return [];
    }

    return (data || []).map((r) => r.client_id);
  };

  const updateClientRelations = async (
    type: RelationType,
    entityId: string,
    clientIds: string[]
  ): Promise<boolean> => {
    // Delete existing relations
    let deleteError: any = null;

    if (type === "task") {
      const result = await supabase.from("task_clients").delete().eq("task_id", entityId);
      deleteError = result.error;
    } else if (type === "post") {
      const result = await supabase.from("post_clients").delete().eq("post_id", entityId);
      deleteError = result.error;
    } else if (type === "meeting") {
      const result = await supabase.from("meeting_clients").delete().eq("meeting_id", entityId);
      deleteError = result.error;
    }

    if (deleteError) {
      console.error(`Error deleting ${type} clients:`, deleteError);
      return false;
    }

    // Insert new relations
    if (clientIds.length > 0) {
      let insertError: any = null;

      if (type === "task") {
        const relations = clientIds.map((clientId) => ({
          task_id: entityId,
          client_id: clientId,
        }));
        const result = await supabase.from("task_clients").insert(relations);
        insertError = result.error;
      } else if (type === "post") {
        const relations = clientIds.map((clientId) => ({
          post_id: entityId,
          client_id: clientId,
        }));
        const result = await supabase.from("post_clients").insert(relations);
        insertError = result.error;
      } else if (type === "meeting") {
        const relations = clientIds.map((clientId) => ({
          meeting_id: entityId,
          client_id: clientId,
        }));
        const result = await supabase.from("meeting_clients").insert(relations);
        insertError = result.error;
      }

      if (insertError) {
        console.error(`Error inserting ${type} clients:`, insertError);
        return false;
      }
    }

    return true;
  };

  const getEntityIdsByClientId = async (
    type: RelationType,
    clientId: string
  ): Promise<string[]> => {
    if (type === "task") {
      const { data, error } = await supabase
        .from("task_clients")
        .select("task_id")
        .eq("client_id", clientId);
      if (error) {
        console.error(`Error fetching tasks by client:`, error);
        return [];
      }
      return (data || []).map((r) => r.task_id);
    } else if (type === "post") {
      const { data, error } = await supabase
        .from("post_clients")
        .select("post_id")
        .eq("client_id", clientId);
      if (error) {
        console.error(`Error fetching posts by client:`, error);
        return [];
      }
      return (data || []).map((r) => r.post_id);
    } else if (type === "meeting") {
      const { data, error } = await supabase
        .from("meeting_clients")
        .select("meeting_id")
        .eq("client_id", clientId);
      if (error) {
        console.error(`Error fetching meetings by client:`, error);
        return [];
      }
      return (data || []).map((r) => r.meeting_id);
    }

    return [];
  };

  return {
    fetchClientIds,
    updateClientRelations,
    getEntityIdsByClientId,
  };
};
