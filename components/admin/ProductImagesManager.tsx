"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, GripVertical, Loader2, Star, Trash2, Upload, X } from "lucide-react";

import {
  discardUploadedImagesAction,
  uploadProductImageAction,
} from "@/app/admin/productos/actions";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  altFromFileName,
  formatMaxImageSize,
  validateImageFile,
} from "@/lib/image-upload";
import { cn } from "@/lib/utils";

export interface ImageDraft {
  /** URL pública definitiva. Es lo único que se persiste. */
  url: string;
  alt: string;
  /**
   * Path dentro del bucket. Solo lo tienen las imágenes subidas EN
   * ESTA sesión de edición: sirve para poder borrar el archivo si el
   * admin la saca del listado o cancela el modal antes de guardar.
   * Las imágenes que vienen de la base llegan sin este campo (su
   * limpieza la resuelve el servidor al guardar, comparando URLs).
   */
  storagePath?: string;
}

interface ProductImagesManagerProps {
  images: ImageDraft[];
  onChange: (images: ImageDraft[]) => void;
  /**
   * Avisa al formulario si hay subidas en curso, para que no se pueda
   * guardar el producto con imágenes a medio subir (se perderían).
   */
  onUploadingChange?: (uploading: boolean) => void;
}

/** Fila temporal: existe solo mientras el archivo viaja al bucket. */
interface PendingUpload {
  id: string;
  fileName: string;
  /** `blob:` local — preview inmediata, antes de que exista la URL real. */
  previewUrl: string | null;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────
// Gestor de imágenes del producto.
//
// CAMBIO DE ORIGEN DE LAS IMÁGENES (única diferencia con la versión
// anterior): antes se pegaba una URL a mano; ahora se eligen archivos
// del explorador (o se sueltan sobre la zona de carga) y la app los
// sube a Supabase Storage. Lo que se guarda en `product_images` sigue
// siendo exactamente lo mismo de antes: una URL pública.
//
// El drag&drop de REORDENAR es el mismo de siempre, sin tocar: mismo
// `draggable` nativo, mismos handlers, misma UX. Coexisten dos
// drag&drop distintos y no se pisan: el de archivos solo reacciona
// cuando el `dataTransfer` trae `Files` (arrastrar una fila de la
// lista no trae archivos).
//
// FLUJO DE UNA SUBIDA
//   elegir archivo
//     → validación local (tipo/tamaño) — feedback instantáneo
//     → preview inmediata con `URL.createObjectURL` (blob local)
//     → uploadProductImageAction (Server Action → service → Storage)
//     → llega la URL pública → se reemplaza la preview por la imagen
//       real y recién ahí entra al listado ordenable
//
// Una subida que falla NO rompe nada: queda una fila roja con el
// motivo, descartable, y el resto del formulario sigue funcionando
// (requisito 11).
// ─────────────────────────────────────────────────────────────
export default function ProductImagesManager({
  images,
  onChange,
  onUploadingChange,
}: ProductImagesManagerProps) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // Espejo de `images`: las subidas resuelven de forma asincrónica y
  // varias pueden terminar entre dos renders, así que cada una tiene
  // que partir de la lista más reciente y no de la del render en el
  // que arrancó (si no, la última pisaría a las anteriores).
  const imagesRef = useRef(images);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const uploadingCount = pending.filter((item) => item.error === null).length;

  useEffect(() => {
    onUploadingChange?.(uploadingCount > 0);
  }, [uploadingCount, onUploadingChange]);

  // Libera los `blob:` al desmontar — si no, quedan reteniendo el
  // archivo en memoria hasta recargar la página.
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function releasePreview(url: string | null) {
    if (!url) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  }

  function commit(next: ImageDraft[]) {
    imagesRef.current = next;
    onChange(next);
  }

  const uploadFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      const localError = validateImageFile(file);

      if (localError) {
        setPending((prev) => [
          ...prev,
          { id, fileName: file.name, previewUrl: null, error: localError },
        ]);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      setPending((prev) => [...prev, { id, fileName: file.name, previewUrl, error: null }]);

      const formData = new FormData();
      formData.append("file", file);

      const { asset, error } = await uploadProductImageAction(formData);

      if (error || !asset) {
        // Se conserva la preview para que el admin vea CUÁL falló.
        setPending((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, error: error ?? "No se pudo subir la imagen." } : item
          )
        );
        continue;
      }

      setPending((prev) => prev.filter((item) => item.id !== id));
      releasePreview(previewUrl);
      commit([
        ...imagesRef.current,
        { url: asset.url, alt: altFromFileName(file.name), storagePath: asset.path },
      ]);
    }
    // `commit` y `releasePreview` solo usan refs → no hacen falta como
    // dependencias y la función se mantiene estable entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesSelected(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length > 0) void uploadFiles(files);
    // Permite volver a elegir el MISMO archivo dos veces seguidas
    // (sin esto, el input no dispara `change` la segunda vez).
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(index: number) {
    const target = imagesRef.current[index];
    commit(imagesRef.current.filter((_, i) => i !== index));

    // Si la subimos en esta sesión y todavía no se guardó, el archivo
    // no lo referencia nadie: se borra del bucket ahora mismo.
    if (target?.storagePath) {
      void discardUploadedImagesAction([target.storagePath]);
    }
  }

  function dismissPending(id: string) {
    setPending((prev) => {
      const target = prev.find((item) => item.id === id);
      releasePreview(target?.previewUrl ?? null);
      return prev.filter((item) => item.id !== id);
    });
  }

  // ── Reordenar (sin cambios respecto de la versión anterior) ──
  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...imagesRef.current];
    const [moved] = next.splice(dragIndex, 1);
    if (moved) next.splice(targetIndex, 0, moved);
    commit(next);
    setDragIndex(null);
    setOverIndex(null);
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...imagesRef.current];
    const [moved] = next.splice(index, 1);
    if (moved) next.unshift(moved);
    commit(next);
  }

  // ── Soltar archivos sobre la zona de carga ──
  function hasFiles(event: React.DragEvent) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleZoneDrop(event: React.DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setFileOver(false);
    handleFilesSelected(event.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        multiple
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setFileOver(true);
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={handleZoneDrop}
        className={cn(
          "flex flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          fileOver ? "border-ink bg-beige-100" : "border-warmgray-300 bg-beige-50"
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-warmgray-300 bg-white px-3 py-2 text-sm transition-colors hover:border-ink"
        >
          <Upload size={15} /> Subir imágenes
        </button>
        <p className="text-[11px] text-warmgray-500">
          Arrastrá archivos acá o elegilos de tu computadora. JPG, PNG, WEBP, AVIF o GIF, hasta{" "}
          {formatMaxImageSize()} cada uno.
        </p>
      </div>

      {images.length === 0 && pending.length === 0 ? (
        <p className="rounded-lg bg-beige-50 px-3 py-4 text-center text-xs text-warmgray-500">
          Todavía no hay imágenes. La primera que agregues va a ser la portada.
        </p>
      ) : (
        <ul className="space-y-2">
          {images.map((img, i) => (
            <li
              key={`${img.url}-${i}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDrop={() => handleDrop(i)}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-white p-2 transition-colors",
                overIndex === i && dragIndex !== i ? "border-ink" : "border-warmgray-200",
                dragIndex === i && "opacity-50"
              )}
            >
              <span className="cursor-grab text-warmgray-400 active:cursor-grabbing">
                <GripVertical size={16} />
              </span>

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-beige-100">
                {img.url ? (
                  <Image
                    src={img.url}
                    alt={img.alt || "Imagen del producto"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-warmgray-600">
                  {img.alt || img.url.split("/").pop()}
                </p>
                {i === 0 ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-beige-100 px-2 py-0.5 text-[10px] font-medium text-earth-600">
                    <Star size={10} className="fill-earth-500 text-earth-500" /> Portada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeCover(i)}
                    className="mt-1 text-[10px] text-warmgray-500 underline hover:text-ink"
                  >
                    Usar como portada
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeImage(i)}
                className="rounded-lg p-1.5 text-warmgray-400 hover:bg-red-50 hover:text-red-500"
                aria-label="Quitar imagen"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}

          {pending.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-white p-2",
                item.error ? "border-red-200 bg-red-50/50" : "border-warmgray-200"
              )}
            >
              <span className="w-4 shrink-0" />

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-beige-100">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview local (`blob:`), no pasa por el optimizador de Next.
                  <img
                    src={item.previewUrl}
                    alt={item.fileName}
                    className={cn(
                      "h-full w-full object-cover",
                      item.error ? "opacity-40 grayscale" : "opacity-60"
                    )}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-warmgray-400">
                    <AlertCircle size={16} />
                  </span>
                )}
                {!item.error && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/40">
                    <Loader2 size={16} className="animate-spin text-ink" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-warmgray-600">{item.fileName}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    item.error ? "text-red-600" : "text-warmgray-500"
                  )}
                >
                  {item.error ?? "Subiendo..."}
                </p>
              </div>

              {item.error && (
                <button
                  type="button"
                  onClick={() => dismissPending(item.id)}
                  className="rounded-lg p-1.5 text-warmgray-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="Descartar"
                >
                  <X size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
