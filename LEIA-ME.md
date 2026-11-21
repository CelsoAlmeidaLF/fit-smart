# Fit Systekna — PWA (v1.2 · MVP)

## Instalação no servidor SHTTPS
1. Copie a pasta `fit/` inteira para a raiz do servidor (ex.: `/fit/`).
2. Abra no celular: `https://localhost:8080/fit/` (ou o endereço do seu servidor).
3. Chrome (Android): menu ⋮ → **Instalar app**. iPhone (Safari): Compartilhar → **Adicionar à Tela de Início**.

## Estrutura
- `index.html` — o app completo (ícones, fontes e ilustração anatômica embutidos; funciona offline, sem chamadas externas)
- `privacidade.html` — política de privacidade em página pública (para a Play Store)
- `manifest.webmanifest` — nome, ícones, cores e atalhos
- `sw.js` — service worker (cache offline e aviso de nova versão)
- `icons/` — 192, 512, maskable 512 e apple-touch-icon

## Atualizar o app
1. Substitua o `index.html`.
2. Em `sw.js`, mude o valor de `VERSAO`.
3. Ao abrir, o app mostra **"Nova versão disponível · Atualizar"**.

## Primeiro acesso
- Em um aparelho novo, o app abre o cadastro inicial (perfil, objetivo, plano, PIN opcional e aceite da política).
- Quem já usava o app continua com os dados atuais, sem passar pelo cadastro.
- **Apagar todos os dados** volta o app ao primeiro acesso.

## Checklist para a Play Store
1. **Política de privacidade com URL pública:** publique `privacidade.html` (ex.: no GitHub Pages) e preencha o e-mail de contato no item 10.
2. **Formulário "Segurança dos dados":** marcar que o app **não coleta** nem **compartilha** dados (tudo fica no aparelho).
3. **Declaração de app de saúde** no Play Console: categoria Saúde e fitness; informar que não é dispositivo médico.
4. **Classificação etária:** 18+ (o cadastro inicial bloqueia menores de 18).
5. **Empacotamento:** TWA via PWABuilder (o PWA precisa estar em HTTPS público) ou Capacitor.
6. Conta pessoal nova: teste fechado com 12 testadores por 14 dias antes da produção.

## Observações
- Os dados ficam no `localStorage` do aparelho. Use **Configurações → Copiar backup** antes de limpar os dados do navegador.
- O PIN é guardado como código cifrado (SHA-256). Esquecer o PIN exige apagar os dados.
- Créditos: ilustração anatômica js-rich-body-highlighter (MIT); ícones Material Symbols (Apache 2.0); fonte Open Sans (OFL).
