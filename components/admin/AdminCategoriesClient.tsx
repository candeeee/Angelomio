"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Category } from "@/lib/types";
import { slugify } from "@/lib/utils";
import {
  createCategoryAction,
  updateCategoryAction,
  updateCategoryOrderAction,
  deleteCategoryAction,
  type CategoryFormInput,
} from "@/app/admin/categorias/actions";
import BrandLoader from "@/components/ui/BrandLoader";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface AdminCategoriesClientProps {
  initialCategories: Category[];
}

type EditableCategory = Omit<Category, "id"> & { id?: string };

export default function AdminCategoriesClient({ initialCategories }: AdminCategoriesClientProps) {
  const [list, setList] = useState<Category[]>(
    [...initialCategories].sort((a, b) => a.order - b.order)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditableCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Igual que en productos: revalidatePath() invalida la caché del
  // servidor y router.refresh() es lo que trae ese resultado a la vista
  // actual sin recargar la página.
  useEffect(() => {
    setList([...initialCategories].sort((a, b) => a.order - b.order));
  }, [initialCategories]);

  function openCreate() {
    setEditing({ name: "", slug: "", order: list.length + 1 });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing({ ...cat });
    setError(null);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;

    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (result.error) {
        alert(`No se pudo eliminar la categoría: ${result.error}`);
        return;
      }
      setList((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    });
  }

  function handleSave() {
    if (!editing) return;
    setError(null);

    const payload: CategoryFormInput = {
      name: editing.name,
      slug: editing.slug,
      order: editing.order,
      image: editing.image,
    };

    startTransition(async () => {
      const result = editing.id
        ? await updateCategoryAction(editing.id, payload)
        : await createCategoryAction(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      setModalOpen(false);
      setEditing(null);
      router.refresh();
    });
  }

  function move(cat: Category, direction: -1 | 1) {
    const idx = list.findIndex((c) => c.id === cat.id);
    if (idx === -1) return;

    const swapIdx = idx + direction;
    const other = list[swapIdx];
    if (!other) return;

    const nextList = [...list];
    nextList[idx] = other;
    nextList[swapIdx] = cat;
    setList(nextList);

    // Persistimos el swap de `order` en Supabase — antes esto solo vivía
    // en el estado local y se perdía al recargar.
    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        updateCategoryOrderAction(cat.id, other.order),
        updateCategoryOrderAction(other.id, cat.order),
      ]);
      if (r1.error || r2.error) {
        alert(`No se pudo reordenar: ${r1.error || r2.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {isPending && <BrandLoader variant="overlay" message="Actualizando información..." />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="title-editorial">Categorías</h1>
          <p className="text-sm text-warmgray-500">{list.length} categorías</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nueva categoría
        </Button>
      </div>

      <div className="card-surface divide-y divide-warmgray-100">
        {list.map((cat, i) => (
          <div key={cat.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium">{cat.name}</p>
              <p className="text-xs text-warmgray-500">/{cat.slug}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => move(cat, -1)}
                disabled={i === 0 || isPending}
                className="rounded-lg p-1.5 hover:bg-warmgray-100 disabled:opacity-30"
              >
                <ArrowUp size={15} />
              </button>
              <button
                onClick={() => move(cat, 1)}
                disabled={i === list.length - 1 || isPending}
                className="rounded-lg p-1.5 hover:bg-warmgray-100 disabled:opacity-30"
              >
                <ArrowDown size={15} />
              </button>
              <button onClick={() => openEdit(cat)} className="rounded-lg p-1.5 hover:bg-warmgray-100">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? "Editar categoría" : "Nueva categoría"}
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="field-label">Nombre</label>
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: e.target.value,
                    slug: slugify(e.target.value),
                  })
                }
                className="field"
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
