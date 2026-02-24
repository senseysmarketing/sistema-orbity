

# Ajuste Visual do Indicador de Etapas no Wizard de Planejamento

## Objetivo
Substituir o indicador de etapas atual (pills com emoji e texto) pelo estilo usado no modal de tarefas: circulos numerados conectados por linhas, com o nome da etapa abaixo.

## Alteracao

### ContentPlanWizard.tsx
- Importar o componente `WizardStepIndicator` de `@/components/ui/wizard-step-indicator`
- Remover o bloco atual do step indicator (as pills com emojis)
- Substituir pelo `WizardStepIndicator` passando:
  - `currentStep={step + 1}` (o componente usa base 1)
  - `totalSteps={5}`
  - `stepLabels={["Contexto", "Frequencia", "Estilo", "Direcionamento", "IA"]}`
- Remover a constante `STEPS` que nao sera mais usada

### Resultado Visual
Antes: pills horizontais com emojis e texto truncado
Depois: circulos numerados (1-5) com linhas conectoras e labels curtos abaixo, etapas completas em verde com check

