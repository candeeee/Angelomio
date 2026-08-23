"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star, Copy, Check, X, Loader2, ArchiveRestore } from "lucide-react";

import { Product, ProductStatus, Category } from "@/lib/types";
import { formatPrice, cn, slugify } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  checkSlugAction,
  getProductBySlugAction,
  saveProductImagesAction,
  duplicateProductAction,
  discardUploadedImagesAction,
  restoreProductAction,
  type ProductFormInput,
} from "@/app/admin/productos/actions";

import DataTable, { Column } from "@/components/admin/DataTable";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import FormSection from "@/components/ui/FormSection";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ProductImagesManager, { type ImageDraft } from "@/components/admin/ProductImagesManager";
import BrandLoader from "@/components/ui/BrandLoader";

interface AdminProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
}

type EditableProduct = Omit<Product, "id" | "images" | "variants" | "createdAt"> & {
  id?: string;
};

type SlugCheckStatus = "idle" | "checking" | "available" | "taken";

function emptyProduct(categories: Category[]): EditableProduct {
  return {
    slug: "",
    name: "",
    description: "",
    price: 0,
    sku: "",
    categoryId: categories[0]?.id ?? "",
    status: "active",
    featured: false,
    stock: 0,
  };
}

export default function AdminProductsClient({
  initialProducts,
  categories,
}: AdminProductsClientProps) {
  // `initialProducts` viene del Server Component (page.tsx), que ya
  // consultó Supabase. Como las Server Actions llaman a revalidatePath(),
  // Next.js vuelve a ejecutar ese Server Component y nos pasa props
  // frescas — por eso alcanza con sincronizar el estado local con la prop.
  const [list, setList] = useState<Product[]>(initialProducts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditableProduct | null>(null);
  const [images, setImages] = useState<ImageDraft[]>([]);
  // Hay imágenes viajando al bucket: no se puede guardar todavía, se
  // perderían las que no terminaron de subir.
  const [uploadingImages, setUploadingImages] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugCheckStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  // Aviso neutro (no es un error): "se archivó en vez de eliminarse",
  // "se restauró", etc.
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();
  const slugCheckSeq = useRef(0);
  const router = useRouter();

  // Las Server Actions ya llaman a revalidatePath(), pero eso invalida
  // la caché del servidor: sin pedirle al router que vuelva a buscar el
  // árbol, la vista actual sigue mostrando las props viejas hasta un F5.
  // router.refresh() hace ese pedido sin recargar el navegador (no se
  // pierde el estado del modal, ni el scroll, ni el carrito).
  useEffect(() => {
    setList(initialProducts);
  }, [initialProducts]);

  // ── Validación de slug en vivo (debounce) ──
  useEffect(() => {
    const slug = editing?.slug?.trim();
    if (!modalOpen || !slug) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    const mySeq = ++slugCheckSeq.current;

    const timer = setTimeout(async () => {
      const { available } = await checkSlugAction(slug, editing?.id);
      // Ignora respuestas viejas si el usuario siguió tipeando mientras
      // esta consulta estaba en vuelo.
      if (mySeq === slugCheckSeq.current) {
        setSlugStatus(available ? "available" : "taken");
      }
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.slug, modalOpen]);

  function openCreate() {
    setEditing(emptyProduct(categories));
    setImages([]);
    setSlugTouched(false);
    setSlugStatus("idle");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    const { images: productImages, variants, createdAt, ...rest } = product;
    setEditing(rest);
    // Sin `storagePath`: son imágenes ya persistidas. Si el admin las
    // saca, el archivo lo limpia el servidor al guardar
    // (`syncProductImages`), no el cliente.
    setImages(productImages.map((img) => ({ url: img.url, alt: img.alt })));
    // Un producto existente ya tiene un slug intencional — no lo
    // pisamos automáticamente solo porque se edite el nombre.
    setSlugTouched(true);
    setSlugStatus("idle");
    setError(null);
    setModalOpen(true);
  }

  /**
   * Cierra el modal descartando el trabajo no guardado. Las imágenes
   * que se subieron en esta sesión y nunca llegaron a persistirse se
   * borran del bucket: si no, cada formulario cancelado dejaría
   * archivos huérfanos pagando storage para siempre.
   */
  function cancelModal() {
    // Si hay un guardado en curso, cerrar y borrar archivos a mitad de
    // camino sería destruir justo lo que se está persistiendo.
    if (isPending) return;

    const orphanPaths = images
      .map((img) => img.storagePath)
      .filter((path): path is string => !!path);

    if (orphanPaths.length > 0) {
      void discardUploadedImagesAction(orphanPaths);
    }

    closeModal();
  }

  /** Cierre "limpio": lo usa el guardado exitoso, no borra nada. */
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setImages([]);
    setUploadingImages(false);
  }

  function handleNameChange(name: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      name,
      slug: slugTouched ? editing.slug : slugify(name),
    });
  }

  function handleSlugChange(slug: string) {
    if (!editing) return;
    setSlugTouched(true);
    setEditing({ ...editing, slug });
  }

  function handleDuplicate(product: Product) {
    setPageError(null);
    startTransition(async () => {
      const result = await duplicateProductAction(product.id);
      if (result.error || !result.product) {
        setPageError(`No se pudo duplicar "${product.name}": ${result.error}`);
        return;
      }
      setList((prev) => [result.product as Product, ...prev]);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;

    const name = deleteTarget.name;

    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (result.error) {
        setPageError(`No se pudo eliminar "${name}": ${result.error}`);
        setDeleteTarget(null);
        return;
      }

      if (result.archived) {
        // Tenía ventas: sigue existiendo, archivado. No se saca de la
        // tabla — el admin tiene que poder verlo y restaurarlo.
        setList((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status: "hidden" as ProductStatus, archivedAt: new Date().toISOString() }
              : p
          )
        );
        setPageNotice(
          `"${name}" tiene ventas registradas, así que se archivó en vez de eliminarse. Ya no aparece en la tienda y el historial de pedidos queda intacto.`
        );
      } else {
        setList((prev) => prev.filter((p) => p.id !== id));
        setPageNotice(`"${name}" se eliminó definitivamente.`);
      }

      setDeleteTarget(null);
      router.refresh();
    });
  }

  function handleRestore(product: Product) {
    setPageError(null);
    setPageNotice(null);

    startTransition(async () => {
      const result = await restoreProductAction(product.id);
      if (result.error) {
        setPageError(`No se pudo restaurar "${product.name}": ${result.error}`);
        return;
      }
      setList((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, archivedAt: undefined } : p))
      );
      setPageNotice(
        `"${product.name}" volvió del archivo. Queda oculto hasta que lo actives desde el formulario.`
      );
      router.refresh();
    });
  }

  function handleSave() {
    if (!editing) return;
    if (!editing.slug.trim()) {
      setError("El slug no puede estar vacío.");
      return;
    }
    if (slugStatus === "taken" || slugStatus === "checking") return;
    if (uploadingImages) {
      setError("Esperá a que terminen de subirse las imágenes.");
      return;
    }

    setError(null);

    const payload: ProductFormInput = {
      slug: editing.slug,
      name: editing.name,
      description: editing.description,
      price: editing.price,
      compareAtPrice: editing.compareAtPrice,
      sku: editing.sku,
      categoryId: editing.categoryId,
      stock: editing.stock,
      featured: editing.featured,
      status: editing.status,
    };

    startTransition(async () => {
      const result = editing.id
        ? await updateProductAction(editing.id, payload)
        : await createProductAction(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      // Si es un producto nuevo, necesitamos su id real (generado por
      // Supabase) para poder guardarle las imágenes — createProductAction
      // no lo devuelve (no se modificó esa acción), así que lo buscamos
      // por el slug que acabamos de guardar.
      let productId = editing.id;
      if (!productId) {
        const { product } = await getProductBySlugAction(payload.slug);
        productId = product?.id;
        // Guardamos el id en el estado del formulario: si el guardado de
        // imágenes de abajo fallara, un reintento debe actualizar el
        // producto ya creado, no crear uno duplicado.
        if (productId) {
          const capturedId = productId;
          setEditing((prev) => (prev ? { ...prev, id: capturedId } : prev));
        }
      }

      if (productId) {
        const imgResult = await saveProductImagesAction(
          productId,
          images.map((img) => ({ url: img.url, alt: img.alt }))
        );
        if (imgResult.error) {
          setError(`El producto se guardó, pero hubo un error con las imágenes: ${imgResult.error}`);
          return;
        }
      }

      closeModal();
      router.refresh();
    });
  }

  const discountPct =
    editing?.compareAtPrice && editing.compareAtPrice > editing.price
      ? Math.round(100 - (editing.price / editing.compareAtPrice) * 100)
      : null;

  const columns: Column<Product>[] = [
    {
      header: "Producto",
      accessor: (p) => (
        <div className="flex items-center gap-2">
          <span>{p.name}</span>
          {p.featured && <Star size={14} className="fill-earth-400 text-earth-400" />}
        </div>
      ),
    },
    { header: "SKU", accessor: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    { header: "Precio", accessor: (p) => formatPrice(p.price) },
    { header: "Stock", accessor: (p) => p.stock },
    {
      header: "Estado",
      accessor: (p) => (
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            p.archivedAt
              ? "bg-amber-100 text-amber-700"
              : p.status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-warmgray-100 text-warmgray-500"
          )}
        >
          {p.archivedAt ? "Archivado" : p.status === "active" ? "Activo" : "Oculto"}
        </span>
      ),
    },
    {
      header: "Acciones",
      accessor: (p) => (
        <div className="flex gap-1">
          <button
            onClick={() => openEdit(p)}
            className="rounded-lg p-1.5 hover:bg-warmgray-100"
            aria-label="Editar"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDuplicate(p)}
            disabled={isPending}
            className="rounded-lg p-1.5 hover:bg-warmgray-100 disabled:opacity-40"
            aria-label="Duplicar"
            title="Duplicar producto"
          >
            <Copy size={16} />
          </button>
          {p.archivedAt ? (
            <button
              onClick={() => handleRestore(p)}
              disabled={isPending}
              className="rounded-lg p-1.5 hover:bg-warmgray-100 disabled:opacity-40"
              aria-label="Restaurar"
              title="Sacar del archivo"
            >
              <ArchiveRestore size={16} />
            </button>
          ) : (
            <button
              onClick={() => setDeleteTarget(p)}
              className="rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500"
              aria-label="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {isPending && <BrandLoader variant="overlay" message="Actualizando información..." />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="title-editorial">Productos</h1>
          <p className="text-sm text-warmgray-500">{list.length} productos en catálogo</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nuevo producto
        </Button>
      </div>

      {pageError && (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{pageError}</span>
          <button onClick={() => setPageError(null)} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
      )}

      {pageNotice && (
        <div className="flex items-start justify-between gap-3 rounded-sm bg-beige-100 px-4 py-3 text-sm leading-relaxed text-warmgray-700">
          <span>{pageNotice}</span>
          <button onClick={() => setPageNotice(null)} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
      )}

      <DataTable columns={columns} data={list} keyExtractor={(p) => p.id} />

      <Modal
        open={modalOpen}
        onClose={cancelModal}
        title={editing?.id ? "Editar producto" : "Crear producto"}
      >
        {editing && (
          <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
            <FormSection title="Información básica">
              <div>
                <label className="field-label">Nombre</label>
                <input
                  value={editing.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label className="field-label">Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-warmgray-400">/productos/</span>
                  <input
                    value={editing.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="field font-mono"
                  />
                </div>
                <div className="mt-1.5 min-h-[16px] text-xs">
                  {slugStatus === "checking" && (
                    <span className="flex items-center gap-1 text-warmgray-500">
                      <Loader2 size={12} className="animate-spin" /> Verificando disponibilidad...
                    </span>
                  )}
                  {slugStatus === "available" && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Check size={12} /> URL disponible.
                    </span>
                  )}
                  {slugStatus === "taken" && (
                    <span className="flex items-center gap-1 text-red-600">
                      <X size={12} /> Ya existe un producto con ese slug.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="field-label">Categoría</label>
                <select
                  value={editing.categoryId}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                  className="field"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">Descripción</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={3}
                  className="field"
                />
              </div>
            </FormSection>

            <FormSection title="Venta">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Precio</label>
                  <input
                    type="number"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Precio de oferta</label>
                  <input
                    type="number"
                    value={editing.compareAtPrice ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        compareAtPrice: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="field"
                  />
                </div>
              </div>

              {discountPct !== null && (
                <p className="text-xs text-warmgray-500">
                  Descuento: <span className="font-medium text-earth-500">{discountPct}%</span> — se
                  calcula solo a partir de precio y precio de oferta, no se guarda por separado.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Stock</label>
                  <input
                    type="number"
                    value={editing.stock}
                    onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">SKU</label>
                  <input
                    value={editing.sku}
                    onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                    className="field"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Estado">
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.status === "active"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.checked ? "active" : ("hidden" as ProductStatus),
                      })
                    }
                  />
                  Activo (visible en la tienda)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.featured}
                    onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                  />
                  Destacado
                </label>
              </div>
            </FormSection>

            <FormSection title="Multimedia">
              <ProductImagesManager
                images={images}
                onChange={setImages}
                onUploadingChange={setUploadingImages}
              />
            </FormSection>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={cancelModal} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isPending ||
                  uploadingImages ||
                  slugStatus === "taken" ||
                  slugStatus === "checking"
                }
              >
                {isPending ? "Guardando..." : uploadingImages ? "Subiendo imágenes..." : "Guardar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="¿Seguro que querés eliminar este producto?"
        description={
          deleteTarget
            ? `Si "${deleteTarget.name}" nunca se vendió, se elimina definitivamente. Si tiene ventas registradas, se archiva: deja de aparecer en la tienda pero se conserva para no romper el historial de pedidos.`
            : undefined
        }
        confirmLabel="Eliminar"
        danger
        loading={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}