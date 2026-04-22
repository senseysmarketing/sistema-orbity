import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import {
  applyMapping,
  autoMapColumns,
  CLIENT_FIELDS,
  ClientField,
  isFullyAutoMapped,
} from "@/lib/import/columnMapper";
import { validateClientsV2, ValidationError } from "@/lib/import/validators";
import { useToast } from "@/hooks/use-toast";

interface Props {
  rawRows: Record<string, any>[];
  headers: string[];
  onCancel: () => void;
  onContinue: (validRows: any[]) => void;
}

export function SmartMappingPreview({ rawRows, headers, onCancel, onContinue }: Props) {
  const { toast } = useToast();
  const [mapping, setMapping] = useState<Record<string, ClientField | null>>(() =>
    autoMapColumns(headers)
  );
  const [editedRows, setEditedRows] = useState<Record<string, any>[]>(rawRows);
  const [autoToastShown, setAutoToastShown] = useState(false);

  const mappedRows = useMemo(() => applyMapping(editedRows, mapping), [editedRows, mapping]);
  const { valid, errors } = useMemo(() => validateClientsV2(mappedRows), [mappedRows]);
  const fullyAuto = useMemo(() => isFullyAutoMapped(mapping), [mapping]);

  useEffect(() => {
    if (fullyAuto && errors.length === 0 && !autoToastShown) {
      toast({ title: "Colunas detectadas automaticamente", description: "Mapeamento 100% identificado." });
      setAutoToastShown(true);
    }
  }, [fullyAuto, errors.length, autoToastShown, toast]);

  const errorsByRow = useMemo(() => {
    const map = new Map<number, ValidationError[]>();
    errors.forEach((e) => {
      const arr = map.get(e.row) ?? [];
      arr.push(e);
      map.set(e.row, arr);
    });
    return map;
  }, [errors]);

  const handleCellEdit = (rowIdx: number, header: string, value: string) => {
    setEditedRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [header]: value };
      return next;
    });
  };

  const previewRows = editedRows.slice(0, 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mapeamento & Pré-visualização</h2>
          <p className="text-sm text-muted-foreground">
            Confirme as colunas detectadas e revise os dados antes de continuar
          </p>
        </div>
        {fullyAuto && errors.length === 0 && (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15">
            <Sparkles className="h-3 w-3 mr-1" />
            Auto-detectado
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            <div>
              <p className="text-2xl font-semibold">{valid.length}</p>
              <p className="text-xs text-muted-foreground">Linhas válidas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <div>
              <p className="text-2xl font-semibold">{errors.length}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-7 w-7 text-amber-500" />
            <div>
              <p className="text-2xl font-semibold">
                {Object.values(mapping).filter((v) => v === null).length}
              </p>
              <p className="text-xs text-muted-foreground">Colunas ignoradas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapping table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coluna do arquivo → Campo do sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="text-sm font-medium truncate flex-1" title={h}>{h}</span>
                <span className="text-muted-foreground">→</span>
                <Select
                  value={mapping[h] ?? "__none__"}
                  onValueChange={(v) =>
                    setMapping((prev) => ({ ...prev, [h]: v === "__none__" ? null : (v as ClientField) }))
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Ignorar —</SelectItem>
                    {CLIENT_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label} {f.required ? "*" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pré-visualização ({previewRows.length} de {editedRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {headers.map((h) => (
                    <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, idx) => {
                  const rowNumber = idx + 2;
                  const rowErrors = errorsByRow.get(rowNumber) ?? [];
                  const errorFields = new Set(rowErrors.map((e) => e.field));
                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-xs text-muted-foreground">{rowNumber}</TableCell>
                      {headers.map((h) => {
                        const target = mapping[h];
                        const hasError = target ? errorFields.has(target) : false;
                        return (
                          <TableCell
                            key={h}
                            className={hasError ? "bg-destructive/10" : ""}
                          >
                            <Input
                              value={String(row[h] ?? "")}
                              onChange={(e) => handleCellEdit(idx, h, e.target.value)}
                              className={`h-8 text-sm ${hasError ? "border-destructive" : ""}`}
                            />
                            {hasError && (
                              <p className="text-[10px] text-destructive mt-1">
                                {rowErrors.find((e) => e.field === target)?.message}
                              </p>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Voltar</Button>
        <Button onClick={() => onContinue(valid)} disabled={errors.length > 0 || valid.length === 0}>
          Avançar
        </Button>
      </div>
    </div>
  );
}
