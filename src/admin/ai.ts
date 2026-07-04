import { supabase } from '../lib/supabase';

export interface AiContainerResult {
  containerNo: string | null;
  sealNo: string | null;
  iso6346Valid: boolean;
  containerMatch: boolean | null;
  confidence: 'high' | 'medium' | 'low';
  notes: string | null;
  model?: string;
}

/** Calls the `analyze-container` Edge Function (Claude vision) to read the container/seal number. */
export async function analyzeContainer(input: {
  imageUrl?: string; imageBase64?: string; expectedContainerNo?: string;
}): Promise<AiContainerResult> {
  const { data, error } = await supabase.functions.invoke('analyze-container', { body: input });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as AiContainerResult;
}
