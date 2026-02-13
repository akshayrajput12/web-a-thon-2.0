import { supabase } from "@/integrations/supabase/client";

// Helper for tables not yet in the generated types (e.g. coding_rounds)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseUntyped = supabase as any;
