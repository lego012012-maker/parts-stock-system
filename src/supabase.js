import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ddoolvbyteyftdpmuwhw.supabase.co";

const supabaseKey = "sb_publishable_H6u1W3qFg9ehQe2Uu_kvSA_hO1wIvll";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);