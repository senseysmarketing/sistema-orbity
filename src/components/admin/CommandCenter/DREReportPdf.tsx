import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DREMonth } from "@/hooks/useDREHistory";
import type { DREValues } from "@/lib/dre";

const currency = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL",
}).format(value);
const percent = (value: number) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
}).format(value) + "%";
const label = (month: string) => {
  const [year, number] = month.split("-").map(Number);
  return new Date(year, number - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const styles = StyleSheet.create({
  page: { paddingTop: 35, paddingBottom: 38, paddingHorizontal: 34, fontFamily: "Helvetica", fontSize: 10, color: "#1f2937" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, marginBottom: 18, borderBottom: "1 solid #d1d5db" },
  agency: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#23334d" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 6 },
  sub: { fontSize: 9, color: "#667085", marginTop: 4 },
  foot: { position: "absolute", bottom: 20, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", borderTop: "1 solid #e5e7eb", paddingTop: 6, fontSize: 8, color: "#667085" },
  row: { flexDirection: "row", borderBottom: "1 solid #e5e7eb", minHeight: 29, alignItems: "center" },
  header: { backgroundColor: "#edf2f7", fontFamily: "Helvetica-Bold" },
  total: { backgroundColor: "#f8fafc", fontFamily: "Helvetica-Bold" },
  cell: { paddingVertical: 7, paddingHorizontal: 6 },
  label: { flex: 1 },
  value: { width: 165, textAlign: "right" },
  monthCell: { width: 88 },
  comparisonValue: { flex: 1, textAlign: "right", fontSize: 8 },
  note: { marginTop: 17, fontSize: 8, color: "#667085", lineHeight: 1.45 },
});

const summaryTotals = (months: DREMonth[]): DREValues => {
  const keys = ["receitaBruta", "impostos", "receitaLiquida", "custosOper", "folhaPag", "ebitda"] as const;
  const sums = Object.fromEntries(keys.map((k) => [k, months.reduce((acc, row) => acc + row.values[k], 0)])) as
    Pick<DREValues, typeof keys[number]>;
  return {
    ...sums,
    margemPct: sums.receitaBruta !== 0 ? sums.ebitda / sums.receitaBruta * 100 : 0,
    effectiveTaxRate: sums.receitaBruta !== 0 ? sums.impostos / sums.receitaBruta : 0,
  };
};

const lines: Array<{ name: string; key: keyof DREValues; percent?: boolean; total?: boolean }> = [
  { name: "Receita Bruta", key: "receitaBruta" },
  { name: "(–) Impostos e Tributos", key: "impostos" },
  { name: "= Receita Líquida", key: "receitaLiquida", total: true },
  { name: "(–) Custos Operacionais", key: "custosOper" },
  { name: "(–) Folha de Pagamento", key: "folhaPag" },
  { name: "= Resultado operacional gerencial", key: "ebitda", total: true },
  { name: "Margem operacional", key: "margemPct", percent: true, total: true },
];

interface Props {
  agencyName: string;
  months: DREMonth[];
  issuedAt: string;
  currentMonth: string;
}

export function DREReportPdf({ agencyName, months, issuedAt, currentMonth }: Props) {
  const period = months.length === 1
    ? label(months[0].month)
    : label(months[0].month) + " a " + label(months[months.length - 1].month);

  const header = (heading: string) => (
    <View style={styles.top}>
      <View>
        <Text style={styles.agency}>{agencyName || "Agência"}</Text>
        <Text style={styles.title}>{heading}</Text>
        <Text style={styles.sub}>Período: {period}</Text>
      </View>
      <Text style={styles.sub}>Emitido em {issuedAt}</Text>
    </View>
  );
  const footer = () => (
    <View style={styles.foot} fixed>
      <Text>DRE gerencial — competência aproximada pelo vencimento; não substitui DRE contábil.</Text>
      <Text render={({ pageNumber, totalPages }) => String(pageNumber) + " / " + String(totalPages)} />
    </View>
  );

  return (
    <Document title={"DRE Gerencial - " + period} author={agencyName || "Orbity"}>
      {months.length > 1 && (
        <Page size="A4" orientation="landscape" style={styles.page} wrap>
          {header("DRE — resumo comparativo")}
          <View style={[styles.row, styles.header]}>
            {["Competência", "Receita bruta", "Impostos", "Receita líquida", "Custos", "Folha", "Resultado", "Margem"].map((h, index) => (
              <Text key={h} style={[styles.cell, index === 0 ? styles.monthCell : styles.comparisonValue]}>{h}</Text>
            ))}
          </View>
          {months.map((item) => (
            <View key={item.month} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.monthCell]}>{item.month.split("-").reverse().join("/")}{item.month === currentMonth ? " *" : ""}</Text>
              {(["receitaBruta", "impostos", "receitaLiquida", "custosOper", "folhaPag", "ebitda"] as const).map((key) => (
                <Text key={key} style={[styles.cell, styles.comparisonValue]}>{currency(item.values[key])}</Text>
              ))}
              <Text style={[styles.cell, styles.comparisonValue]}>{percent(item.values.margemPct)}</Text>
            </View>
          ))}
          {(() => {
            const total = summaryTotals(months);
            return (
              <View style={[styles.row, styles.total]} wrap={false}>
                <Text style={[styles.cell, styles.monthCell]}>Total</Text>
                {(["receitaBruta", "impostos", "receitaLiquida", "custosOper", "folhaPag", "ebitda"] as const).map((key) => (
                  <Text key={key} style={[styles.cell, styles.comparisonValue]}>{currency(total[key])}</Text>
                ))}
                <Text style={[styles.cell, styles.comparisonValue]}>{percent(total.margemPct)}</Text>
              </View>
            );
          })()}
          {months.some((m) => m.month === currentMonth) && <Text style={styles.note}>* Competência em andamento: valores podem sofrer alterações.</Text>}
          {footer()}
        </Page>
      )}
      {months.map(({ month, values }) => (
        <Page key={month} size="A4" orientation="landscape" style={styles.page} wrap>
          {header("DRE — " + label(month))}
          <View style={[styles.row, styles.header]}>
            <Text style={[styles.cell, styles.label]}>Descrição</Text>
            <Text style={[styles.cell, styles.value]}>Valor</Text>
          </View>
          {lines.map((line) => (
            <View key={line.key} style={[styles.row, line.total ? styles.total : {}]} wrap={false}>
              <Text style={[styles.cell, styles.label]}>{line.name}</Text>
              <Text style={[styles.cell, styles.value]}>{line.percent ? percent(values[line.key]) : currency(values[line.key])}</Text>
            </View>
          ))}
          {month === currentMonth && <Text style={styles.note}>Competência em andamento: dados parciais, sem projeção automática.</Text>}
          <Text style={styles.note}>Receitas: valor faturado das cobranças não canceladas. Despesas e folha: lançamentos não cancelados. Todos classificados pelo mês do vencimento. O resultado é gerencial e não representa necessariamente o caixa recebido.</Text>
          {footer()}
        </Page>
      ))}
    </Document>
  );
}
