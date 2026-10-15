import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useColumnMappingEditor } from "../hooks/use-column-mapping-editor";
type SourceEditor = Pick<
  ReturnType<typeof useColumnMappingEditor>,
  "sheet" | "setSheet" | "header" | "setHeader" | "pending" | "selectionChanged" | "snapshot"
>;
export const mappingSelectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";
export function MappingSourceForm({
  editor,
  onPreview,
}: {
  editor: SourceEditor;
  onPreview: (selection: { sheet_name: string; header_row: number }) => void;
}) {
  const { sheet, setSheet, header, setHeader, pending, selectionChanged, snapshot } = editor;
  return (
    <>
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          onPreview({ sheet_name: sheet, header_row: Number(header) });
        }}
      >
        <label className="grid gap-2 text-sm">
          برگه فایل
          <select
            className={mappingSelectClass}
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            disabled={pending}
          >
            {snapshot.sheets.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          شماره ردیف عنوان
          <Input
            type="number"
            min={1}
            max={50020}
            required
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            disabled={pending}
          />
        </label>
        <Button type="submit" variant="outline" className="self-end" disabled={pending}>
          نمایش عنوان و پیش‌نمایش
        </Button>
      </form>
      {selectionChanged && (
        <p role="status">برای ویرایش ستون‌ها، ابتدا عنوان و پیش‌نمایش جدید را نمایش دهید.</p>
      )}
    </>
  );
}
