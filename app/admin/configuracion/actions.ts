"use server";

import { revalidatePath } from "next/cache";
import { upsertStoreSettings, type StoreSettingsInput } from "@/lib/services/store-settings";

export async function upsertStoreSettingsAction(input: StoreSettingsInput) {
  const { error } = await upsertStoreSettings(input);
  if (error) return { error: error.message };

  // Se usa en Navbar/Hero/Footer/Contacto/Checkout — revalidar todo el
  // sitio para que el cambio se vea en cualquier página.
  revalidatePath("/", "layout");
  return { error: null };
}
