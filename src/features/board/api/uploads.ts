import { supabase } from "@/lib/supabase";
const BUCKET = "board-assets";

export async function uploadImageFile(file: File) {
  if (file.size > 5 * 1024 * 1024) throw new Error("Max file size 5MB");
  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}


