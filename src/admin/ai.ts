import { supabase } from '../lib/supabase';

export type AiIssue = 'blur' | 'illegible' | 'mismatch' | null;
export interface AiPhoto { index: number; label: string; reshoot: boolean; issue: AiIssue }
export interface AiReview {
  containerNo: string | null;
  sealNo: string | null;
  iso6346Valid: boolean;
  containerMatch: boolean | null;
  damage: { detected: boolean; summary: string | null; items: string[] };
  photos: AiPhoto[];
  reshootCount: number;
  okCount: number;
  total: number;
  confidence: 'high' | 'medium' | 'low';
  model?: string;
}

/** Runs the AI 자동 검수 pass (Claude vision) over a container's photos via the Edge Function. */
export async function analyzeReview(input: {
  images: { label: string; imageUrl: string }[]; expectedContainerNo?: string;
}): Promise<AiReview> {
  const { data, error } = await supabase.functions.invoke('analyze-container', { body: input });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as AiReview;
}
