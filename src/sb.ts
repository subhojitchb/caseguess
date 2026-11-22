import { createClient } from '@supabase/supabase-js'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')
export type Case = { id: string; number: number; title: string; difficulty: string; category: string; intro: string; location: string; est_minutes: number; motives: string[]; methods: string[] }
