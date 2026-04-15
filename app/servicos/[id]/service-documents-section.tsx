"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionsMenu } from "../../components/actions-menu";
import { formatSimpleDateTime } from "../../../lib/date-utils";
import { supabase } from "../../../lib/supabase";
import type { ServicoDocumento } from "../types";

type ServiceDocumentsSectionProps = {
  serviceId: number;
  documents: ServicoDocumento[];
  currentUserId?: string | null;
};

const STORAGE_BUCKET = "servico-documentos";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const acceptedFileExtensions = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".tif",
  ".tiff",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".kml",
  ".kmz",
  ".zip",
] as const;

function formatFileSize(sizeInBytes: number | null) {
  if (sizeInBytes === null || sizeInBytes === undefined) {
    return "-";
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName: string) {
  const extension = fileName.match(/\.[^.]+$/)?.[0]?.toLowerCase();
  return extension ?? "";
}

function sanitizeFileName(fileName: string) {
  const extension = getFileExtension(fileName);
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${baseName || "arquivo"}${extension}`;
}

function getPublicDocumentUrl(path: string | null) {
  if (!path) {
    return null;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function getFileTypeLabel(document: ServicoDocumento) {
  const extension = getFileExtension(document.nome_original ?? "");

  if (extension) {
    return extension.replace(".", "").toUpperCase();
  }

  if (document.tipo_mime) {
    return document.tipo_mime;
  }

  return "Arquivo";
}

export function ServiceDocumentsSection({
  serviceId,
  documents,
  currentUserId = null,
}: ServiceDocumentsSectionProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [observation, setObservation] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const documentItems = useMemo(
    () =>
      documents.map((document) => ({
        ...document,
        publicUrl: getPublicDocumentUrl(document.caminho_storage),
      })),
    [documents]
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedFile(nextFile);
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Selecione um arquivo para anexar.");
      return;
    }

    const extension = getFileExtension(selectedFile.name);

    if (!acceptedFileExtensions.includes(extension as (typeof acceptedFileExtensions)[number])) {
      setErrorMessage("Formato nao permitido para este anexo.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("O arquivo excede o limite de 50 MB.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFileName(selectedFile.name);
    const storagePath = `servicos/${serviceId}/${timestamp}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || undefined,
      });

    if (uploadError) {
      setIsUploading(false);
      setErrorMessage("Nao foi possivel enviar o arquivo agora.");
      return;
    }

    const metadataPayload = {
      servico_id: serviceId,
      nome_original: selectedFile.name,
      nome_arquivo: `${timestamp}-${sanitizedFileName}`,
      caminho_storage: storagePath,
      tipo_mime: selectedFile.type || null,
      tamanho_bytes: selectedFile.size,
      observacao: observation.trim() || null,
      criado_por: currentUserId || null,
    };

    const [{ error: documentError }, { error: eventError }] = await Promise.all([
      supabase.from("servico_documentos").insert(metadataPayload),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "documento",
        titulo: "Documento anexado",
        descricao: selectedFile.name,
      }),
    ]);

    if (documentError || eventError) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      setIsUploading(false);
      setErrorMessage("O arquivo foi enviado, mas nao foi possivel registrar o anexo.");
      return;
    }

    setSelectedFile(null);
    setObservation("");
    setIsUploading(false);
    setSuccessMessage("Documento anexado com sucesso.");
    router.refresh();
  }

  async function handleDelete(document: ServicoDocumento) {
    const shouldDelete = window.confirm("Tem certeza que deseja remover este anexo?");

    if (!shouldDelete) {
      return;
    }

    setDeletingDocumentId(document.id);
    setErrorMessage("");
    setSuccessMessage("");

    const storagePath = document.caminho_storage;

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (storageError) {
        setDeletingDocumentId(null);
        setErrorMessage("Nao foi possivel remover o arquivo do storage.");
        return;
      }
    }

    const [{ error: deleteError }, { error: eventError }] = await Promise.all([
      supabase.from("servico_documentos").delete().eq("id", document.id),
      supabase.from("servico_eventos").insert({
        servico_id: serviceId,
        tipo: "documento",
        titulo: "Documento removido",
        descricao: document.nome_original ?? document.nome_arquivo ?? "Anexo",
      }),
    ]);

    setDeletingDocumentId(null);

    if (deleteError || eventError) {
      setErrorMessage("Nao foi possivel remover o anexo agora.");
      return;
    }

    setSuccessMessage("Documento removido com sucesso.");
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#17352b]">
              Documentos do servico
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Anexe arquivos tecnicos e administrativos direto no contexto deste servico.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {documents.length} anexo{documents.length === 1 ? "" : "s"}
          </span>
        </div>

        <form
          onSubmit={handleUpload}
          className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[1.2fr_1fr_auto]"
        >
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Arquivo
            <input
              type="file"
              accept={acceptedFileExtensions.join(",")}
              onChange={handleFileChange}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#17352b] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            <span className="text-xs font-normal text-slate-500">
              Permitidos: PDF, imagem, DOCX, XLSX, KML, ZIP. Limite de 50 MB.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Observacao
            <input
              type="text"
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Ex.: planta assinada, memorial final, protocolo"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#17352b] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#204638] disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
            >
              {isUploading ? "Enviando..." : "Anexar"}
            </button>
          </div>
        </form>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}
      </div>

      {documentItems.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-slate-500">
          Nenhum documento anexado para este servico.
        </div>
      ) : (
        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {documentItems.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {getFileTypeLabel(document)}
                  </span>
                  <h4 className="mt-3 truncate text-sm font-semibold text-[#17352b]">
                    {document.nome_original ?? document.nome_arquivo ?? "-"}
                  </h4>
                </div>

                <ActionsMenu
                  items={[
                    ...(document.publicUrl
                      ? [
                          {
                            label: "Abrir arquivo",
                            onClick: () => window.open(document.publicUrl!, "_blank"),
                          },
                        ]
                      : []),
                    {
                      label:
                        deletingDocumentId === document.id
                          ? "Removendo..."
                          : "Remover",
                      onClick: () => handleDelete(document),
                      disabled: deletingDocumentId === document.id,
                      tone: "danger",
                    },
                  ]}
                />
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-500">
                <div className="flex items-center justify-between gap-3">
                  <span>Tamanho</span>
                  <span className="font-medium text-slate-700">
                    {formatFileSize(document.tamanho_bytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Anexado em</span>
                  <span className="font-medium text-slate-700">
                    {formatSimpleDateTime(document.criado_em)}
                  </span>
                </div>
              </div>

              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-500">
                {document.observacao?.trim() || "Sem observacao adicional."}
              </p>

              {document.publicUrl ? (
                <LinkButton href={document.publicUrl} />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LinkButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
    >
      Abrir documento
    </a>
  );
}
