"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseImportZip } from "@/lib/import/parseZip";
import { parseImportCsv } from "@/lib/import/parseCsv";
import { validateAll } from "@/lib/import/validate";
import { runImport } from "@/lib/import/runImport";
import type { PreviewRow, ImportSummary } from "@/lib/import/types";

type ImportMethod = "zip" | "csv";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 11,
  color: "#8A8781",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #E6E3DE",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  color: "#2D2C2A",
  background: "white",
  borderRadius: 2,
};

const statusColors: Record<string, string> = {
  valid: "#2D2C2A",
  warning: "#8A8781",
  error: "#8A8781",
  duplicate: "#8A8781",
};

const templates = [
  { href: "/import-templates/properties-template.csv", label: "properties-template.csv" },
  { href: "/import-templates/example-listing.md", label: "example-listing.md" },
  { href: "/import-templates/example-metadata.json", label: "example-metadata.json" },
  { href: "/import-templates/README-import-format.md", label: "README-import-format.md" },
];

export default function BulkImportForm() {
  const [method, setMethod] = useState<ImportMethod>("zip");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imagesZipFile, setImagesZipFile] = useState<File | null>(null);

  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleParse() {
    setParseError("");
    setPreviewRows(null);
    setSummary(null);
    setParsing(true);

    try {
      const supabase = createClient();

      const properties =
        method === "zip"
          ? await parseImportZip(zipFile!)
          : await parseImportCsv(csvFile!, imagesZipFile);

      if (properties.length === 0) {
        throw new Error("No properties found in the uploaded file(s).");
      }

      const { data: existing } = await supabase.from("properties").select("slug");
      const existingSlugs = new Set((existing ?? []).map((p) => p.slug as string));

      setPreviewRows(validateAll(properties, existingSlugs));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse import file.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!previewRows) return;
    setImporting(true);
    setProgress({ done: 0, total: 0 });

    try {
      const supabase = createClient();
      const result = await runImport(supabase, previewRows, (done, total) => setProgress({ done, total }));
      setSummary(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const importableCount = previewRows?.filter((r) => r.status === "valid" || r.status === "warning").length ?? 0;

  return (
    <div className="space-y-10">
      {/* Templates */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Import Templates
        </h2>
        <p className="text-[14px] mb-4" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
          Download an example to see the expected format before uploading.
        </p>
        <div className="flex flex-wrap gap-3">
          {templates.map((t) => (
            <a
              key={t.href}
              href={t.href}
              download
              className="px-4 py-2 text-[13px] transition-colors hover:bg-[#F5F4F1]"
              style={{ border: "1px solid #E6E3DE", borderRadius: 2, fontFamily: "Inter, system-ui, sans-serif", color: "#2D2C2A" }}
            >
              {t.label}
            </a>
          ))}
        </div>
      </section>

      {/* Method + upload */}
      <section>
        <h2
          className="font-display text-2xl mb-6"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
        >
          Upload Properties
        </h2>

        <div className="mb-6">
          <label style={labelStyle}>Import Method</label>
          <div className="flex gap-2">
            {(["zip", "csv"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMethod(m);
                  setPreviewRows(null);
                  setSummary(null);
                }}
                className="px-5 py-2 text-[13px] uppercase tracking-[0.05em] transition-colors"
                style={{
                  border: "1px solid #E6E3DE",
                  borderRadius: 2,
                  fontFamily: "Inter, system-ui, sans-serif",
                  background: method === m ? "#111111" : "white",
                  color: method === m ? "white" : "#2D2C2A",
                }}
              >
                {m === "zip" ? "ZIP Folder" : "CSV + Images ZIP"}
              </button>
            ))}
          </div>
        </div>

        {method === "zip" ? (
          <div>
            <label style={labelStyle}>Properties ZIP</label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
              className="w-full px-4 py-3"
              style={inputStyle}
            />
            <p className="mt-2 text-[12px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
              One folder per property, each with listing.md or metadata.json and an /images folder.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label style={labelStyle}>properties.csv</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="w-full px-4 py-3"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>images.zip</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setImagesZipFile(e.target.files?.[0] ?? null)}
                className="w-full px-4 py-3"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || (method === "zip" ? !zipFile : !csvFile)}
            className="px-8 py-4 text-[13px] tracking-[0.08em] uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {parsing ? "Parsing..." : "Parse & Preview"}
          </button>
        </div>

        {parseError && (
          <p className="mt-4 text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
            {parseError}
          </p>
        )}
      </section>

      {/* Preview */}
      {previewRows && !summary && (
        <section>
          <h2
            className="font-display text-2xl mb-6"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
          >
            Preview ({previewRows.length} detected)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E6E3DE" }}>
                  {["Name", "Location", "Price", "Beds", "Baths", "Images", "Status", "Notes"].map((h) => (
                    <th key={h} className="text-left py-2 pr-4" style={{ color: "#8A8781", fontWeight: 400 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.property.folderName} style={{ borderBottom: "1px solid #F5F4F1" }}>
                    <td className="py-2 pr-4" style={{ color: "#2D2C2A" }}>{row.property.name || "—"}</td>
                    <td className="py-2 pr-4" style={{ color: "#2D2C2A" }}>{row.property.location || "—"}</td>
                    <td className="py-2 pr-4" style={{ color: "#2D2C2A" }}>{row.property.price_label || "—"}</td>
                    <td className="py-2 pr-4" style={{ color: "#2D2C2A" }}>{row.property.bedrooms ?? "—"}</td>
                    <td className="py-2 pr-4" style={{ color: "#2D2C2A" }}>{row.property.bathrooms ?? "—"}</td>
                    <td className="py-2 pr-4" style={{ color: "#2D2C2A" }}>{row.property.images.length}</td>
                    <td className="py-2 pr-4 uppercase tracking-[0.05em]" style={{ color: statusColors[row.status] }}>
                      {row.status}
                    </td>
                    <td className="py-2 pr-4" style={{ color: "#8A8781" }}>{row.messages.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || importableCount === 0}
              className="px-8 py-4 text-[13px] tracking-[0.08em] uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "#111111", borderRadius: 4, fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {importing
                ? `Importing... (${progress.done}/${progress.total})`
                : `Import ${importableCount} Propert${importableCount === 1 ? "y" : "ies"}`}
            </button>
          </div>
        </section>
      )}

      {/* Summary */}
      {summary && (
        <section>
          <h2
            className="font-display text-2xl mb-6"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111", borderBottom: "1px solid #E6E3DE", paddingBottom: "16px" }}
          >
            Import Complete
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Detected", value: summary.totalDetected },
              { label: "Imported", value: summary.totalImported },
              { label: "Skipped", value: summary.totalSkipped },
              { label: "Errors", value: summary.totalErrors },
            ].map((s) => (
              <div key={s.label} style={{ borderTop: "1px solid #E6E3DE" }} className="pt-4">
                <p className="font-display text-3xl" style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#111111" }}>
                  {s.value}
                </p>
                <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {summary.results.map((r) => (
              <div
                key={r.slug}
                className="flex items-center justify-between py-3 px-4"
                style={{ border: "1px solid #E6E3DE", fontFamily: "Inter, system-ui, sans-serif" }}
              >
                <div>
                  <span className="text-[14px]" style={{ color: "#2D2C2A" }}>{r.name}</span>
                  {r.message && (
                    <span className="text-[12px] ml-3" style={{ color: "#8A8781" }}>{r.message}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className="text-[11px] uppercase tracking-[0.05em]"
                    style={{ color: r.status === "imported" ? "#2D2C2A" : "#8A8781" }}
                  >
                    {r.status}
                  </span>
                  {r.status === "imported" && r.propertyId && (
                    <Link
                      href={`/dashboard/properties/${r.propertyId}/edit`}
                      className="text-[13px] px-3 py-1.5 transition-colors hover:bg-[#F5F4F1]"
                      style={{ border: "1px solid #E6E3DE", borderRadius: 2, color: "#2D2C2A" }}
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[13px]" style={{ color: "#8A8781", fontFamily: "Inter, system-ui, sans-serif" }}>
            All imported properties are unpublished. Review and publish them from the{" "}
            <Link href="/dashboard" style={{ color: "#2D2C2A", textDecoration: "underline" }}>
              properties dashboard
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
