# Fit Systekna — Especificação da Versão 2

**Status:** documentado para a v2 · **Data:** 20/11/2026 · **Responsável:** Celso (Systekna)

A v1 (MVP) é um app pessoal, offline e sem servidor. A v2 traz dois blocos principais:

1. **Relatório de saúde para consultas** — um documento pronto para mostrar ao médico ou a outro profissional.
2. **Módulo Profissionais** — o usuário convida profissionais para acompanhar seus dados, com consentimento e prazo.

Além disso, este documento registra o **backlog** de melhorias levantadas durante o MVP.

---

## 1. Relatório de saúde para consultas

### 1.1 Objetivo
Gerar, em poucos toques, um resumo confiável dos dados do usuário num período, para levar a consultas e evitar que o paciente dependa da memória.

### 1.2 Conteúdo do relatório
| Seção | Dados | Origem no app |
|---|---|---|
| Identificação | Nome, idade, sexo, altura | Configurações › Perfil |
| Peso | Inicial, atual, variação no período, IMC, gráfico | Saúde › Peso |
| Medidas | Cintura (com faixa de risco), abdômen, quadril, braço, coxa | Saúde › Medidas |
| Pressão arterial | Média, menor e maior valor, nº de medições, % em cada faixa, lista com data e hora | Saúde › Pressão |
| Exames | Último resultado e evolução de glicemia, HbA1c, colesterol total, HDL, LDL, triglicerídeos | Saúde › Exames |
| Sono | Média de horas, regularidade, qualidade | Saúde › Sono |
| Alimentação | Média de kcal/dia, dias registrados, aderência à meta | Diário |
| Atividade física | Treinos por semana, minutos, kcal estimadas, tipos | Treino › Histórico |
| Observações | Campo livre do usuário ("o que quero perguntar") | Novo |

### 1.3 Requisitos funcionais
- **RF-01** Escolher o período em combo box: últimos 30 dias, 90 dias, 6 meses, 1 ano ou personalizado.
- **RF-02** Escolher as seções a incluir (todas marcadas por padrão).
- **RF-03** Escolher o modelo em combo box: *Médico (clínico/cardio/endócrino)*, *Nutricionista*, *Personal / educador físico* e *Completo*. Cada modelo pré-seleciona as seções relevantes.
- **RF-04** Gerar o relatório em **PDF** (A4, 1 a 3 páginas), com gráficos, para baixar ou compartilhar pelo celular.
- **RF-05** Mostrar a pré-visualização antes de gerar.
- **RF-06** Rodapé fixo: "Dados registrados pelo próprio paciente no app Fit Systekna. Não é laudo nem diagnóstico."

### 1.4 Regras de negócio
- **RN-01** O relatório nunca interpreta nem diagnostica. Mostra só os valores e as faixas de referência, com a fonte (ex.: Diretriz Brasileira de Hipertensão 2025).
- **RN-02** As faixas de pressão seguem a diretriz vigente; a fonte e a data ficam no rodapé.
- **RN-03** A meta de LDL não é classificada, porque depende do risco cardiovascular avaliado pelo médico.
- **RN-04** Seções sem dados no período aparecem como "Sem registros no período", e não ficam ocultas.
- **RN-05** O PDF é gerado no aparelho, sem envio a servidor.

### 1.5 Critérios de aceite
- Com 30 dias de dados de exemplo, o PDF é gerado em menos de 5 s num celular intermediário.
- Os valores do PDF batem exatamente com os das telas do app (teste com planilha de conferência).
- O PDF abre corretamente no leitor padrão do Android e do iPhone.
- O texto do rodapé aparece em todas as páginas.

### 1.6 Tecnologia sugerida
- Geração no cliente com **jsPDF** e gráficos já existentes convertidos em imagem; ou a impressão do navegador num layout A4 dedicado.
- No app empacotado (Capacitor), usar o plugin de compartilhamento nativo para enviar o PDF.

---

## 2. Módulo Profissionais

### 2.1 Objetivo
Permitir que o usuário compartilhe seus dados com profissionais que o acompanham e receba deles orientações (ficha de treino, plano alimentar, metas), sempre com consentimento explícito e revogável.

### 2.2 Profissionais que podem usar
| Profissional | Conselho (registro) | O que vê | O que pode enviar ao usuário |
|---|---|---|---|
| **Personal trainer / educador físico** | CREF | Treinos, cargas, evolução, peso, medidas | Fichas de treino, plano semanal, metas de carga |
| **Nutricionista** | CRN | Diário alimentar, peso, medidas, exames | Plano alimentar (cardápio), metas de kcal e proteína, lista de alimentos |
| **Médico** — clínico geral, endocrinologista, cardiologista | CRM | Peso, pressão, exames, sono, medidas, resumo de atividade | Metas de pressão/peso, lembrete de exames, orientações em texto |
| **Nutrólogo** (médico) | CRM | Igual ao nutricionista + exames | Metas e orientações em texto |
| **Fisioterapeuta** | CREFITO | Treinos, cargas, dores relatadas (novo campo) | Restrições de exercício, exercícios de reabilitação |
| **Psicólogo** (comportamento alimentar, ansiedade) | CRP | Humor e sono (opcional), aderência à dieta | Orientações em texto, metas de hábito |
| **Enfermeiro** (acompanhamento em UBS ou clínica) | COREN | Pressão, glicemia, peso | Lembretes de aferição |
| **Farmacêutico** (aferição de pressão/glicemia na farmácia) | CRF | Pressão e glicemia | Registro de aferição feita no balcão |
| **Equipe de cirurgia bariátrica** (multiprofissional) | Vários | Conjunto definido pelo usuário | Plano pré e pós-operatório |

> Coaches e influenciadores sem conselho de classe **não** entram como "profissional de saúde". Se a v2 aceitar acompanhantes informais (amigo, familiar, parceiro de treino), eles ficam numa categoria separada, **"Acompanhante"**, sem acesso a dados de saúde sensíveis por padrão.

### 2.3 Fluxos principais
1. **Convite:** o usuário gera um código ou QR com validade de 24 h e escolhe no combo box o tipo de profissional e o **escopo** (quais dados) e o **prazo** (30, 90, 180 dias ou até revogar).
2. **Aceite:** o profissional cria uma conta, informa o registro do conselho (validado por formato e UF; no futuro, por consulta pública ao conselho) e aceita o convite.
3. **Acompanhamento:** o profissional vê um painel dos pacientes, com os dados liberados, alertas configuráveis (ex.: pressão ≥ 140/90 em 2 medições) e o relatório da seção 1.
4. **Envio de orientação:** o profissional envia uma ficha, plano alimentar ou meta; o usuário recebe como **proposta** e só passa a valer depois que ele aceitar.
5. **Revogação:** o usuário remove o acesso a qualquer momento em Configurações › Profissionais; o efeito é imediato.

### 2.4 Requisitos funcionais
- **RF-10** Tela *Configurações › Profissionais* com a lista de vínculos, o escopo, o prazo e a ação de revogar.
- **RF-11** Escopo granular por categoria: Peso e medidas · Alimentação · Treinos · Pressão · Exames · Sono e humor.
- **RF-12** Painel web do profissional (responsivo), com a lista de pacientes, a ficha de cada um e os relatórios.
- **RF-13** Envio de ficha de treino e plano alimentar no mesmo formato dos cadastros do app (importação direta).
- **RF-14** Mensagens curtas entre profissional e usuário, ligadas a um registro (ex.: comentário numa medição de pressão).
- **RF-15** Histórico de acessos visível ao usuário: quem viu, o quê e quando.

### 2.5 Regras de negócio e LGPD
- **RN-10** Dados de saúde são **dados pessoais sensíveis** (LGPD, art. 11). O compartilhamento exige **consentimento específico e destacado** para cada profissional e escopo.
- **RN-11** O consentimento pode ser revogado a qualquer momento, com efeito imediato; o profissional perde o acesso a dados novos e antigos.
- **RN-12** O registro de acessos é guardado por, no mínimo, 6 meses (Marco Civil, art. 15) e fica visível ao usuário.
- **RN-13** O app não prescreve nada. Orientações enviadas aparecem como "Orientação de [nome], [conselho] [número]".
- **RN-14** O profissional só vê dados dentro do escopo e do prazo do vínculo.
- **RN-15** A conta do profissional exige autenticação forte (e-mail verificado + segundo fator).
- **RN-16** O usuário pode exportar e apagar todos os seus dados do servidor (direitos do titular).
- **RN-17** A política de privacidade é revisada antes do lançamento da v2, e o formulário "Segurança dos dados" da Play Store é atualizado, porque passará a haver coleta e compartilhamento.

### 2.6 Arquitetura sugerida
- **Modo local continua sendo o padrão.** A sincronização só é ligada quando o usuário cria um vínculo.
- **Firebase** (Auth + Firestore + regras de segurança), seguindo o padrão já usado no app Despesas da Casa:
  - `users/{uid}`: perfil e preferências
  - `users/{uid}/registros/{tipo}/{id}`: pesos, medidas, pressão, exames, sono, refeições, treinos
  - `vinculos/{id}`: `{pacienteUid, profUid, tipo, escopo[], expiraEm, status}`
  - `acessos/{id}`: log append-only
  - As regras do Firestore validam o escopo e a validade do vínculo em toda leitura.
- **Painel do profissional:** web (PWA) no mesmo design system (Aero 3.0).
- **Criptografia:** TLS em trânsito; em repouso, a do provedor. A avaliar: criptografia ponta a ponta dos campos mais sensíveis (exames).

### 2.7 Critérios de aceite
- Um profissional com vínculo vencido ou revogado recebe "sem acesso" em menos de 5 s.
- Um profissional com escopo "Treinos" não consegue ler exames, nem pela API (teste das regras do Firestore).
- Toda leitura do profissional gera uma linha no histórico de acessos do usuário.
- Uma ficha enviada pelo personal só aparece nos cadastros depois do aceite do usuário.

### 2.8 Riscos
| Risco | Mitigação |
|---|---|
| Vazamento de dado sensível | Regras do Firestore testadas, escopo mínimo, prazo padrão de 90 dias, log de acessos |
| Profissional falso | Validação do registro do conselho + selo "verificado" só após conferência |
| Responsabilidade legal por orientação | RN-13 e termos de uso específicos para profissionais |
| Custo do servidor | Plano gratuito do Firebase cobre o início; monitorar leituras |

---

## 3. Backlog de melhorias (fora do MVP)

| # | Melhoria | Área | Depende de | Prioridade |
|---|---|---|---|---|
| B-01 | Meta de proteína do dia (~1,6 g/kg) e proteína nos alimentos | Dieta | — | Alta |
| B-02 | Macronutrientes (carboidrato, proteína, gordura) | Dieta | B-01 | Média |
| B-03 | Sugestão automática de carga (+2,5 kg após 2 treinos completos) | Treino | — | Alta |
| B-04 | Tipos de série (aquecimento, normal, drop set, até a falha) e volume total | Treino | — | Média |
| B-05 | Sequência de dias (registro da dieta / treino cumprido) | Motivação | — | Média |
| B-06 | Resumo semanal (peso, média de kcal, treinos, cintura) | Motivação | — | Alta |
| B-07 | Jejum intermitente (cronômetro, 16:8, 5:2) | Dieta | — | Baixa |
| B-08 | Leitor de código de barras (Open Food Facts) | Dieta | Câmera, internet | Média |
| B-09 | Tabela TACO de alimentos brasileiros | Dieta | — | Média |
| B-10 | Passos pelo sensor do celular | Atividade | Capacitor | Média |
| B-11 | GPS na caminhada (trajeto, distância, ritmo) | Atividade | Capacitor | Média |
| B-12 | Lembretes (água, refeições, treino, medir pressão) | Hábitos | Capacitor | Alta |
| B-13 | Sincronização entre aparelhos e backup automático | Dados | Firebase | Alta (junto com a seção 2) |
| B-14 | Vistas laterais no mapa muscular | Treino | Ilustração licenciada | Baixa |

---

## 4. Ordem de entrega sugerida para a v2

1. **v2.0** — Relatório de saúde (seção 1) + B-01, B-03, B-06. Continua 100% offline.
2. **v2.1** — Empacotamento com Capacitor + B-10, B-11, B-12.
3. **v2.2** — Firebase (B-13) + Módulo Profissionais (seção 2), começando por **personal trainer** e **nutricionista**, que pedem menos dados sensíveis, e depois **médicos**.
