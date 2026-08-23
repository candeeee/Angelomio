// ─────────────────────────────────────────────────────────────
// Tipos centrales. Reflejan 1:1 el esquema real de Supabase/PostgreSQL
// (ver lib/services/*.ts y supabase/migrations/ para el detalle de
// cada tabla). mock-data.ts ya no existe — toda la app corre sobre
// Supabase.
// ─────────────────────────────────────────────────────────────

// "user" = cliente normal (rol por defecto al registrarse).
// "staff" / "admin" / "owner" = niveles de acceso al panel /admin.
export type Role = "user" | "admin";

// Refleja 1:1 la tabla `profiles` de Supabase (ver supabase/migrations).
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  image?: string;
}

export interface ProductVariant {
  id: string;
  size?: string; // "1 plaza" | "2 plazas" | "king"
  color?: string; // "Blanco" | "Beige" | "Gris"
  stock: number;
  sku_suffix?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

export type ProductStatus = "active" | "hidden";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number; // precio anterior
  sku: string;
  brand?: string;
  categoryId: string;
  images: ProductImage[];
  variants: ProductVariant[];
  status: ProductStatus;
  /**
   * Fecha de archivado (soft delete). `undefined` = producto normal.
   * Un producto archivado queda con `status: "hidden"`, así que la
   * tienda pública ya lo excluye por el filtro que existía de antes;
   * este campo solo sirve para que el panel pueda distinguir "lo oculté
   * a propósito" de "lo eliminé pero tiene ventas".
   */
  archivedAt?: string;
  featured: boolean;
  stock: number; // stock total (suma de variantes o simple)
  createdAt: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variantLabel?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export type OrderStatus =
  | "pendiente"
  | "confirmado"
  | "preparando"
  | "enviado"
  | "entregado";

export interface OrderItem {
  productId: string;
  name: string;
  variantLabel?: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = "transferencia" | "mercado_pago" | "efectivo" | "otro";

export interface Order {
  id: string;
  number: string; // ej: "AM-0001"
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes?: string;
  };
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  logoUrl: string;
  bannerUrl: string;
  welcomeText: string;
  whatsappNumber: string; // formato internacional sin '+', ej: 5491122334455
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  primaryColor: string;
  paymentMethods: PaymentMethod[];
  shipping: {
    cost: number;
    zones: string[];
    info: string;
  };
}