import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, Save, Loader2 } from "lucide-react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { toast } from "sonner";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  contractNumber: { fontSize: 10, color: '#666' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  text: { lineHeight: 1.5, textAlign: 'justify' },
  bold: { fontWeight: 'bold' },
  table: { marginTop: 10, marginBottom: 10 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #ddd', padding: 5 },
  tableHeader: { fontWeight: 'bold', backgroundColor: '#f5f5f5' },
  tableCol1: { width: '50%' },
  tableCol2: { width: '30%' },
  tableCol3: { width: '20%', textAlign: 'right' },
  signatures: { marginTop: 40 },
  signatureLine: { marginTop: 60, borderTop: '1px solid #000', paddingTop: 5, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#666' },
});

interface ContractPreviewProps {
  data: any;
  onComplete: () => void;
}

export default function ContractPreview({ data, onComplete }: ContractPreviewProps) {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const [saving, setSaving] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const ContractPDF = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</Text>
          <Text style={styles.contractNumber}>Contrato Nº: {new Date().getTime()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. DAS PARTES</Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>CONTRATANTE: </Text>
            {data.client_name}, {data.client_cpf_cnpj && `CPF/CNPJ ${data.client_cpf_cnpj}, `}
            {data.client_address && `residente/estabelecido em ${data.client_address}, ${data.client_city} - ${data.client_state}`}, 
            doravante denominado CONTRATANTE.
          </Text>
          <Text style={[styles.text, { marginTop: 10 }]}>
            <Text style={styles.bold}>CONTRATADO: </Text>
            {currentAgency?.name}, com sede em {currentAgency?.description || "___________"}, 
            doravante denominada CONTRATADO.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. DO OBJETO</Text>
          <Text style={styles.text}>
            O presente contrato tem como objeto a prestação dos seguintes serviços:
          </Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCol1}>Serviço</Text>
              <Text style={styles.tableCol2}>Descrição</Text>
              <Text style={styles.tableCol3}>Valor</Text>
            </View>
            {data.services?.map((service: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCol1}>{service.name}</Text>
                <Text style={styles.tableCol2}>{service.description}</Text>
                <Text style={styles.tableCol3}>{formatCurrency(service.value)}</Text>
              </View>
            ))}
            <View style={[styles.tableRow, { fontWeight: 'bold', backgroundColor: '#f9f9f9' }]}>
              <Text style={styles.tableCol1}>TOTAL</Text>
              <Text style={styles.tableCol2}></Text>
              <Text style={styles.tableCol3}>{formatCurrency(data.total_value)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. DO VALOR E FORMA DE PAGAMENTO</Text>
          <Text style={styles.text}>
            O valor total dos serviços é de {formatCurrency(data.total_value)} ({data.total_value}).
          </Text>
          {data.payment_terms && (
            <Text style={[styles.text, { marginTop: 5 }]}>
              Condições de pagamento: {data.payment_terms}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. DO PRAZO</Text>
          <Text style={styles.text}>
            O presente contrato tem início em {formatDate(data.start_date)}
            {data.end_date ? ` e término em ${formatDate(data.end_date)}` : ', com prazo indeterminado'}.
          </Text>
        </View>

        {data.custom_clauses && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. CLÁUSULAS ESPECIAIS</Text>
            <Text style={styles.text}>{data.custom_clauses}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. DO FORO</Text>
          <Text style={styles.text}>
            As partes elegem o foro da comarca de {data.client_city || "___________"} para dirimir 
            quaisquer questões oriundas do presente contrato.
          </Text>
        </View>

        <View style={styles.signatures}>
          <Text style={styles.text}>
            E por estarem assim justas e contratadas, firmam o presente instrumento em duas vias de 
            igual teor, na presença de duas testemunhas.
          </Text>
          <Text style={[styles.text, { marginTop: 20, textAlign: 'center' }]}>
            {data.client_city}, {formatDate(data.contract_date)}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 }}>
            <View style={{ width: '45%' }}>
              <Text style={styles.signatureLine}>CONTRATANTE</Text>
              <Text style={{ textAlign: 'center', marginTop: 5, fontSize: 9 }}>{data.client_name}</Text>
            </View>
            <View style={{ width: '45%' }}>
              <Text style={styles.signatureLine}>CONTRATADO</Text>
              <Text style={{ textAlign: 'center', marginTop: 5, fontSize: 9 }}>{currentAgency?.name}</Text>
            </View>
          </View>

          <View style={{ marginTop: 40 }}>
            <Text style={styles.sectionTitle}>TESTEMUNHAS:</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <View style={{ width: '45%' }}>
                <Text style={styles.signatureLine}></Text>
                <Text style={{ fontSize: 9, marginTop: 5 }}>{data.witness1_name}</Text>
                <Text style={{ fontSize: 9 }}>CPF: {data.witness1_cpf}</Text>
              </View>
              <View style={{ width: '45%' }}>
                <Text style={styles.signatureLine}></Text>
                <Text style={{ fontSize: 9, marginTop: 5 }}>{data.witness2_name}</Text>
                <Text style={{ fontSize: 9 }}>CPF: {data.witness2_cpf}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );

  const saveContract = async () => {
    if (!currentAgency?.id || !profile?.user_id) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("contracts").insert({
        agency_id: currentAgency.id,
        client_id: data.client_id,
        client_name: data.client_name,
        client_cpf_cnpj: data.client_cpf_cnpj,
        client_address: data.client_address,
        client_city: data.client_city,
        client_state: data.client_state,
        client_phone: data.client_phone,
        client_email: data.client_email,
        witness1_name: data.witness1_name,
        witness1_cpf: data.witness1_cpf,
        witness2_name: data.witness2_name,
        witness2_cpf: data.witness2_cpf,
        services: data.services,
        total_value: data.total_value,
        contract_date: data.contract_date,
        start_date: data.start_date,
        end_date: data.end_date,
        agency_name: currentAgency.name,
        agency_cnpj: "",
        agency_address: currentAgency.description || "",
        agency_representative: profile.name,
        custom_clauses: data.custom_clauses,
        payment_terms: data.payment_terms,
        created_by: profile.user_id,
      });

      if (error) throw error;

      toast.success("Contrato salvo com sucesso!");
      onComplete();
    } catch (error) {
      console.error("Error saving contract:", error);
      toast.error("Erro ao salvar contrato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo do Contrato</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-muted-foreground">Cliente</dt>
            <dd className="font-semibold">{data.client_name}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">CPF/CNPJ</dt>
            <dd>{data.client_cpf_cnpj}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Valor Total</dt>
            <dd className="text-lg font-bold">{formatCurrency(data.total_value)}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Vigência</dt>
            <dd>{formatDate(data.start_date)} {data.end_date && `até ${formatDate(data.end_date)}`}</dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium text-muted-foreground mb-1">Serviços ({data.services?.length})</dt>
            <dd className="space-y-1">
              {data.services?.map((service: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{service.name}</span>
                  <span className="font-medium">{formatCurrency(service.value)}</span>
                </div>
              ))}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="flex gap-3 justify-end">
        <PDFDownloadLink
          document={<ContractPDF />}
          fileName={`contrato_${data.client_name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`}
        >
          {({ loading }) => (
            <Button variant="outline" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              Baixar PDF
            </Button>
          )}
        </PDFDownloadLink>

        <Button onClick={saveContract} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar e Finalizar
        </Button>
      </div>
    </div>
  );
}
