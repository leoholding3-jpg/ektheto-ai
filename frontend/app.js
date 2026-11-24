const IS_LOCAL_HOST = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_BASE_URL = typeof window.EKTHETO_API_BASE_URL === "string"
  ? window.EKTHETO_API_BASE_URL.trim().replace(/\/+$/, "")
  : "";
const apiUrl = (path) => `${API_BASE_URL}${path}`;

const cover = document.querySelector("#cover");
const onboarding = document.querySelector("#onboarding");
const appShell = document.querySelector("#app-shell");
const pageContent = document.querySelector("#page-content");
const menu = document.querySelector("#menu");
const menuButton = document.querySelector("#menu-button");

const slides = [
  {
    image: "/assets/zip-slide-verify.jpg",
    title: "Verifica qualquer imagem",
    copy: "Guarda a foto suspeita que recebeste e faz upload aqui. A Ektheto mostra-te se tem sinais de IA.",
  },
  {
    image: "/assets/zip-slide-investigate.jpg",
    title: "Investiga cada detalhe",
    copy: "A estimativa ajuda a identificar sinais possíveis. Consulta os metadados e fontes relacionadas, mas não trates o resultado como prova.",
  },
  {
    image: "/assets/zip-slide-session.jpg",
    title: "O teu histórico, só na tua sessão",
    copy: "As tuas verificações ficam organizadas e só nesta sessão. Sem login, sem conta, sem guardar fora.",
  },
];

const toolIcons = {
  analisar: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="20" r="13"/><path d="m30 30 12 12M25 14a8 8 0 0 1 5 7"/></svg>',
  historico: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18"/><path d="M24 13v12l8 5"/></svg>',
  radar: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="6"/><path d="M24 5v6m0 26v6M5 24h6m26 0h6M10 10l5 5m18 18 5 5m0-28-5 5m-18 18-5 5"/></svg>',
  ajuda: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18"/><path d="M19 18a5 5 0 1 1 8 4c-3 2-3 3-3 6m0 6h.1"/></svg>',
  sobre: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 43a19 19 0 1 0-9-2L7 44l3-9"/><path d="M24 21v12m0-19h.1"/></svg>',
  definicoes: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="7"/><path d="m20 4-1 5-4 2-4-2-5 6 3 4v5l-4 3 3 7 5-1 4 3 1 5h8l1-5 4-3 5 1 3-7-4-3v-5l3-4-5-6-4 2-4-2-1-5z"/></svg>',
};

const tools = [
  ["analisar", "Analisar"],
  ["historico", "Histórico"],
  ["radar", "Mapa"],
  ["ajuda", "Ajuda"],
  ["sobre", "Sobre"],
  ["definicoes", "Definições"],
];

const translations = {
  English: {
    Continuar: "Continue",
    Seguinte: "Next",
    Começar: "Start",
    "Verifica qualquer imagem": "Check any image",
    "Guarda a foto suspeita que recebeste e faz upload aqui. A Ektheto mostra-te se tem sinais de IA.": "Upload the suspicious photo you received. Ektheto shows signs that may indicate AI.",
    "Investiga cada detalhe": "Investigate every detail",
    "A estimativa ajuda a identificar sinais possíveis. Consulta os metadados e fontes relacionadas, mas não trates o resultado como prova.": "The estimate may help identify possible signals. Check metadata and related sources, but do not treat the result as proof.",
    "O teu histórico, só na tua sessão": "Your history, only in this session",
    "As tuas verificações ficam organizadas e só nesta sessão. Sem login, sem conta, sem guardar fora.": "Your checks stay organized in this session only. No login, no account, nothing stored outside it.",
    "Investigar com cuidado. Verificar com fontes.": "Investigate carefully. Verify with sources.",
    "Analisar imagem": "Analyze image",
    "Escolhe uma imagem para verificar se tem sinais de IA.": "Choose an image to check for signs of AI.",
    "Arrasta a imagem ou toca para escolher": "Drop an image or tap to choose",
    "Escolher imagem da galeria": "Choose an image from your gallery",
    "Arrasta a imagem para aqui ou toca para abrir a galeria.": "Drop an image here or tap to open your gallery.",
    "Análise complementar com Gemini (opcional)": "Additional Gemini analysis (optional)",
    "Se selecionares, a imagem também será enviada ao Google para análise complementar.": "If selected, the image will also be sent to Google for additional analysis.",
    "Análise complementar do Gemini": "Gemini additional analysis",
    "Descrição visual": "Visual description",
    "Texto visível": "Visible text",
    "Pistas observadas": "Observed clues",
    "Hipóteses para verificar": "Hypotheses to check",
    "Verificações sugeridas": "Suggested checks",
    Limitações: "Limitations",
    "A análise do Gemini pode conter erros e não confirma autenticidade.": "Gemini analysis may be wrong and does not establish authenticity.",
    "Gemini não configurado. Adiciona a chave no servidor.": "Gemini is not configured. Add the key on the server.",
    "Credenciais Gemini inválidas.": "Gemini credentials are invalid.",
    "Limite Gemini atingido. Tenta novamente mais tarde.": "Gemini rate limit reached. Try again later.",
    "Modelo Gemini não disponível.": "Gemini model is unavailable.",
    "Gemini demorou demasiado a responder.": "Gemini took too long to respond.",
    "Gemini temporariamente indisponível.": "Gemini is temporarily unavailable.",
    "Gemini devolveu uma resposta inválida.": "Gemini returned an invalid response.",
    "Não foi possível concluir a análise complementar.": "The additional analysis could not be completed.",
    "JPG, JPEG, PNG, WEBP ou BMP · Até 100 MB · 50 MP": "JPG, JPEG, PNG, WEBP or BMP · Up to 100 MB · 50 MP",
    "A Ektheto não guarda a imagem. A análise principal envia-a ao Sightengine; o Gemini só a recebe se selecionares a opção.": "Ektheto does not store the image. The primary check sends it to Sightengine; Gemini receives it only if you opt in.",
    "Passo": "Step",
    "de": "of",
    "Recuar": "Back",
    "Seguir": "Next",
    "Pular tutorial": "Skip tutorial",
    "Concluir": "Finish",
    "Exemplo visual — não é uma análise real.": "Illustrative example — not a real analysis.",
    "Mapa": "Map",
    "Mapa de investigação": "Investigation map",
    "Mapa manual para organizar visualmente uma investigação. Não rastreia links, partilhas ou pessoas.": "A manual map for organizing an investigation. It does not track links, shares, or people.",
    "Pesquisar contexto externo": "Search external context",
    "Escreve palavras-chave ou aceita a descrição do Gemini. Só o texto será enviado para a pesquisa; a imagem não será partilhada.": "Enter keywords or use Gemini's description. Only text is sent to search; the image is not shared.",
    "Pesquisar imagens e notícias relacionadas": "Search related images and news",
    "A escrever pelo menos 2 caracteres.": "Enter at least 2 characters.",
    "A pesquisar fontes...": "Searching sources...",
    "Não foi possível pesquisar as fontes. Tenta novamente.": "Could not search sources. Try again.",
    "Imagens relacionadas": "Related images",
    "Notícias relacionadas": "Related news",
    "Sem imagens relacionadas encontradas.": "No related images found.",
    "Sem notícias encontradas.": "No news found.",
    "Pesquisa textual: estes resultados não confirmam correspondência visual.": "Text search: these results do not confirm visual matches.",
    "A pesquisa de imagens está temporariamente indisponível.": "Image search is temporarily unavailable.",
    Licença: "License",
    "Licença:": "License:",
    Criador: "Creator",
    "Criador:": "Creator:",
    Consulta: "Search query",
    "Ver fonte": "View source",
    "Metadados da imagem": "Image metadata",
    Fabricante: "Make",
    Modelo: "Model",
    Software: "Software",
    "Data de captura": "Capture date",
    "A imagem inclui dados de GPS; as coordenadas não são apresentadas.": "The image contains GPS data; coordinates are not shown.",
    "Os metadados podem ser removidos ou alterados; não são prova de origem.": "Metadata can be removed or changed; it is not proof of origin.",
    "A pesquisa envia apenas o texto da consulta; a imagem não é enviada.": "Only the search text is sent; the image is not sent.",
    "Fontes opcionais sem chave:": "Optional sources without keys:",
    "Algumas fontes falharam:": "Some sources failed:",
    "Mapa manual": "Manual map",
    "Clica num país para o colorir. O mapa não mostra a origem nem a circulação de imagens.": "Click a country to color it. The map does not show image origins or circulation.",
    Analisar: "Analyze",
    Histórico: "History",
    Ajuda: "Help",
    Sobre: "About",
    Definições: "Settings",
    "Voltar para a pesquisa": "Back to search",
    "Voltar para o histórico": "Back to history",
    "Voltar para Definições": "Back to Settings",
    "Voltar para Ajuda": "Back to Help",
    "Voltar para o resultado": "Back to results",
    "Limpar histórico": "Clear history",
    "Limpar histórico?": "Clear history?",
    "Queres apagar todo o histórico desta sessão?": "Do you want to delete all history from this session?",
    "O que vai apagar": "What will be deleted",
    "As verificações e os resultados guardados nesta sessão.": "Checks and results saved in this session.",
    "O que não apaga": "What will not be deleted",
    "As imagens originais não são guardadas pela Ektheto.": "Ektheto does not save the original images.",
    Cancelar: "Cancel",
    "Sim, limpar histórico": "Yes, clear history",
    "Como foi feita a pesquisa": "How the check was done",
    "O que a Ektheto viu": "What Ektheto found",
    "Porque isto acontece": "Why this happens",
    "O que isto não prova": "What this does not prove",
    "Toca em Voltar para ver os outros itens.": "Tap Back to see the other items.",
    "É uma estimativa, não uma prova. Confirma sempre com a fonte original.": "It is an estimate, not proof. Always check the original source.",
    "Este resultado já não está disponível nesta sessão.": "This result is no longer available in this session.",
    "Portugal · Partilha": "Portugal · Shared",
    "Angola · Origem": "Angola · Source",
    "Brasil · Distribuidor": "Brazil · Distributor",
    Idioma: "Language",
    "Como analisar uma imagem?": "How do I check an image?",
    "O que significa Ektheto?": "What does Ektheto mean?",
    "O meu histórico fica guardado?": "Is my history saved?",
    "Não. O histórico fica só nesta sessão e desaparece quando fechas o separador.": "No. History stays in this session and disappears when you close the tab.",
    "Continuar tutorial": "Continue tutorial",
    Tutorial: "Tutorial",
    "Passo 1 · Escolher imagem": "Step 1 · Choose an image",
    "Passo 2 · Analisar": "Step 2 · Analyze",
    "Passo 3 · Perceber o resultado": "Step 3 · Understand the result",
    "Começar tutorial": "Start tutorial",
    "Ainda não fizeste nenhuma pesquisa nesta sessão.": "You have not run a check in this session yet.",
    Selecionado: "Selected",
    "Sinais elevados de geração por IA": "High signs of AI generation",
    "Poucos sinais de geração por IA": "Few signs of AI generation",
    "Sinais inconclusivos": "Inconclusive signs",
    "Histórico da sessão": "Session history",
    "Português · Escolhe o idioma": "Portuguese · Choose a language",
    "English · Escolhe o idioma": "English · Choose a language",
    "Español · Escolhe o idioma": "Spanish · Choose a language",
    "Expor o que é falso. Revelar o que é real.": "Expose what is false. Reveal what is real.",
    "Ferramentas": "Tools",
    Menu: "Menu",
    "Passos de apresentação": "Introduction steps",
    "Passos do tutorial": "Tutorial steps",
    "Pré-visualização da imagem escolhida": "Preview of the selected image",
    "Voltar para Analisar imagem": "Back to Analyze image",
    "Abrir menu": "Open menu",
    "Fechar menu": "Close menu",
    "As verificações feitas nesta sessão.": "Checks completed in this session.",
    "Resultado da pesquisa": "Analysis result",
    "Resultado": "Result",
    "sinais de geração por IA": "signs of AI generation",
    "geração por IA": "AI generation",
    "sinais de manipulação facial": "signs of facial manipulation",
    "Manipulação facial": "Facial manipulation",
    "manipulação facial": "facial manipulation",
    "de confiança do modelo.": "model confidence.",
    "Ver ou limpar o histórico": "View or clear history",
    "O que vimos na imagem antes de dar o resultado.": "What we observed in the image before returning the result.",
    "Seleciona uma imagem e faz a análise para ver os resultados.": "Select an image and run the analysis to see the results.",
    "Um sinal sozinho pode enganar. O resultado é uma estimativa do modelo e deve ser interpretado com cuidado.": "A single signal can be misleading. The result is a model estimate and should be interpreted with care.",
    "Não é uma prova. Pode haver falsos positivos. Confirma sempre com a fonte original.": "This is not proof. False positives are possible. Always check the original source.",
    "Teste - Porquê?": "Test - Why?",
    "Pele - Porquê?": "Skin - Why?",
    "Luz - Porquê?": "Lighting - Why?",
    "Fundo - Porquê?": "Background - Why?",
    "Porque o teste completo cruza vários sinais antes de dar o resultado.": "The full check combines several signals before returning a result.",
    "O resultado combina os indicadores fornecidos pelo modelo de análise.": "The result combines indicators provided by the analysis model.",
    "Um sinal sozinho pode enganar. Em conjunto, os indicadores ajudam a avaliar padrões da imagem.": "A single signal can be misleading. Together, the indicators help assess image patterns.",
    "A pele pode mostrar padrões que ajudam a interpretar uma imagem.": "Skin can show patterns that help interpret an image.",
    "O modelo devolve uma estimativa geral; não mede a pele de forma isolada.": "The model returns an overall estimate; it does not assess skin in isolation.",
    "Textura, contornos e pequenos detalhes podem parecer diferentes em imagens sintetizadas ou comprimidas.": "Texture, edges, and small details can look different in synthetic or compressed images.",
    "A luz ajuda a perceber como os elementos da imagem se relacionam.": "Lighting helps show how elements in an image relate to one another.",
    "A análise não fornece uma medição isolada da luz.": "The analysis does not provide a separate lighting measurement.",
    "Sombras e reflexos podem dar contexto, mas também mudam com edição, câmara e compressão.": "Shadows and reflections can provide context, but they also change with editing, cameras, and compression.",
    "O fundo também pode conter pistas importantes.": "The background may also contain useful clues.",
    "A análise não fornece uma pontuação isolada para o fundo.": "The analysis does not provide a separate background score.",
    "Padrões e objetos ao fundo podem parecer inconsistentes, mas isso não confirma por si só que uma imagem foi gerada por IA.": "Background patterns and objects may look inconsistent, but that alone does not confirm that an image was AI-generated.",
    "Analisar uma imagem": "Analyze an image",
    "Controlos do mapa": "Map controls",
    "Cor do país": "Country color",
    "Cor para pintar um país": "Color to fill a country",
    "Cor do oceano": "Ocean color",
    "Limpar mapa": "Reset map",
    "Exportar SVG": "Export SVG",
    "Mapa-múndi interativo. Clica ou toca num país para o colorir; usa a roda do rato para ampliar.": "Interactive world map. Click or tap a country to color it; use the mouse wheel to zoom.",
    "A carregar mapa...": "Loading map...",
    "Cores originais restauradas.": "Original colors restored.",
    "Mapa exportado em SVG.": "Map exported as SVG.",
    "Não foi possível exportar o mapa. Tenta novamente.": "Could not export the map. Try again.",
    "Não foi possível carregar o mapa. Atualiza a página e tenta novamente.": "Could not load the map. Refresh the page and try again.",
    "Escolhe uma imagem e toca em Analisar. A imagem é enviada apenas para fazer a verificação.": "Choose an image and tap Analyze. The image is sent only to run the check.",
    "A Ektheto procura sinais na imagem e ajuda-te a investigar cada detalhe.": "Ektheto looks for signals in the image and helps you investigate the details.",
    "1 · Escolher uma imagem": "1 · Choose an image",
    "2 · Pedir a análise": "2 · Run the analysis",
    "3 · Ler o resultado": "3 · Read the result",
    "Na página Analisar imagem, toca na caixa da galeria ou arrasta a fotografia para lá. A pré-visualização mostra a imagem escolhida.": "On the Analyze image page, tap the gallery box or drag a photo into it. The preview shows the selected image.",
    "Confirma que escolheste a imagem certa e toca em Analisar. A imagem é enviada ao serviço de análise apenas para esta verificação.": "Confirm that you selected the right image and tap Analyze. The image is sent to the analysis service only for this check.",
    "Consulta a estimativa e abre Como foi feita a pesquisa para ver a explicação. Uma pontuação ajuda a investigar, mas não prova se a imagem é verdadeira ou falsa.": "Review the estimate and open How the check was done for an explanation. A score can help with an investigation, but it does not prove whether an image is real or fake.",
    "Escolher da galeria": "Choose from gallery",
    "Escolhe o idioma da Ektheto.": "Choose Ektheto's language.",
    "A Ektheto ajuda a investigar sinais numa imagem. O resultado é uma estimativa e não prova autenticidade.": "Ektheto helps investigate signals in an image. The result is an estimate, not proof of authenticity.",
    "Formato não suportado. Escolhe JPG, JPEG, PNG, WEBP ou BMP.": "Unsupported format. Choose JPG, JPEG, PNG, WEBP, or BMP.",
    "A imagem excede o limite de 100 MB.": "The image exceeds the 100 MB limit.",
    "A analisar…": "Analyzing…",
    "A imagem está a ser analisada.": "The image is being analyzed.",
    "O resultado é uma estimativa e não prova a autenticidade da imagem.": "The result is an estimate and does not prove the image's authenticity.",
    "O resultado é uma estimativa do modelo e não prova autenticidade.": "The result is a model estimate and does not prove authenticity.",
    "O serviço de análise ainda não está ligado. O backend Render precisa de ser publicado e configurado.": "The analysis service is not connected yet. The Render backend must be deployed and configured.",
    "O servidor de análise não respondeu corretamente. Verifica se o backend Render está ativo.": "The analysis server returned an unexpected response. Check that the Render backend is running.",
    "Não foi possível contactar o serviço de análise. Verifica a ligação e tenta novamente.": "Could not reach the analysis service. Check your connection and try again.",
    "A análise ainda não está configurada neste servidor.": "Image analysis is not configured on this server yet.",
    "O serviço de análise rejeitou as credenciais.": "The analysis service rejected its credentials.",
    "O serviço de análise rejeitou o pedido.": "The analysis service rejected the request.",
    "A resposta do serviço de análise não é válida.": "The analysis service returned an invalid response.",
    "O limite de análises foi atingido. Tenta novamente mais tarde.": "The analysis limit was reached. Try again later.",
    "O serviço está temporariamente indisponível.": "The service is temporarily unavailable.",
    "A análise demorou demasiado. Tenta novamente.": "The analysis took too long. Try again.",
    "Escolhe uma imagem antes de continuar.": "Choose an image before continuing.",
    "A imagem excede a resolução máxima de 50 megapixels.": "The image exceeds the maximum resolution of 50 megapixels.",
    "Este formato de imagem não é suportado.": "This image format is not supported.",
    "Não foi possível validar a imagem. Experimenta outro ficheiro.": "Could not validate the image. Try another file.",
    "Não foi possível concluir a análise. Tenta novamente.": "Could not complete the analysis. Try again.",
    "Análise concluída": "Analysis complete",
  },
  Español: {
    Continuar: "Continuar",
    Seguinte: "Siguiente",
    Começar: "Empezar",
    "Verifica qualquer imagem": "Verifica cualquier imagen",
    "Guarda a foto suspeita que recebeste e faz upload aqui. A Ektheto mostra-te se tem sinais de IA.": "Sube aquí la foto sospechosa que recibiste. Ektheto muestra señales que podrían indicar IA.",
    "Investiga cada detalhe": "Investiga cada detalle",
    "A estimativa ajuda a identificar sinais possíveis. Consulta os metadados e fontes relacionadas, mas não trates o resultado como prova.": "La estimación puede ayudar a identificar indicios. Consulta los metadatos y fuentes relacionadas, pero no la consideres una prueba.",
    "O teu histórico, só na tua sessão": "Tu historial, solo en esta sesión",
    "As tuas verificações ficam organizadas e só nesta sessão. Sem login, sem conta, sem guardar fora.": "Tus verificaciones quedan organizadas solo en esta sesión. Sin iniciar sesión, sin cuenta y sin guardar fuera.",
    "Investigar com cuidado. Verificar com fontes.": "Investigar con cuidado. Verificar con fuentes.",
    "Analisar imagem": "Analizar imagen",
    "Escolhe uma imagem para verificar se tem sinais de IA.": "Elige una imagen para comprobar si tiene señales de IA.",
    "Arrasta a imagem ou toca para escolher": "Arrastra una imagen o toca para elegir",
    "Escolher imagem da galeria": "Elegir una imagen de la galería",
    "Arrasta a imagem para aqui ou toca para abrir a galeria.": "Arrastra la imagen aquí o toca para abrir la galería.",
    "Análise complementar com Gemini (opcional)": "Análisis adicional con Gemini (opcional)",
    "Se selecionares, a imagem também será enviada ao Google para análise complementar.": "Si la seleccionas, la imagen también se enviará a Google para un análisis adicional.",
    "Análise complementar do Gemini": "Análisis adicional de Gemini",
    "Descrição visual": "Descripción visual",
    "Texto visível": "Texto visible",
    "Pistas observadas": "Indicios observados",
    "Hipóteses para verificar": "Hipótesis por comprobar",
    "Verificações sugeridas": "Comprobaciones sugeridas",
    Limitações: "Limitaciones",
    "A análise do Gemini pode conter erros e não confirma autenticidade.": "El análisis de Gemini puede equivocarse y no confirma la autenticidad.",
    "Gemini não configurado. Adiciona a chave no servidor.": "Gemini no está configurado. Añade la clave en el servidor.",
    "Credenciais Gemini inválidas.": "Las credenciales de Gemini no son válidas.",
    "Limite Gemini atingido. Tenta novamente mais tarde.": "Se alcanzó el límite de Gemini. Inténtalo más tarde.",
    "Modelo Gemini não disponível.": "El modelo Gemini no está disponible.",
    "Gemini demorou demasiado a responder.": "Gemini tardó demasiado en responder.",
    "Gemini temporariamente indisponível.": "Gemini no está disponible temporalmente.",
    "Gemini devolveu uma resposta inválida.": "Gemini devolvió una respuesta no válida.",
    "Não foi possível concluir a análise complementar.": "No se pudo completar el análisis adicional.",
    "JPG, JPEG, PNG, WEBP ou BMP · Até 100 MB · 50 MP": "JPG, JPEG, PNG, WEBP o BMP · Hasta 100 MB · 50 MP",
    "A Ektheto não guarda a imagem. A análise principal envia-a ao Sightengine; o Gemini só a recebe se selecionares a opção.": "Ektheto no guarda la imagen. El análisis principal la envía a Sightengine; Gemini solo la recibe si eliges la opción.",
    "Passo": "Paso",
    "de": "de",
    "Recuar": "Atrás",
    "Seguir": "Siguiente",
    "Pular tutorial": "Saltar tutorial",
    "Concluir": "Terminar",
    "Exemplo visual — não é uma análise real.": "Ejemplo visual: no es un análisis real.",
    "Mapa": "Mapa",
    "Mapa de investigação": "Mapa de investigación",
    "Mapa manual para organizar visualmente uma investigação. Não rastreia links, partilhas ou pessoas.": "Mapa manual para organizar visualmente una investigación. No rastrea enlaces, publicaciones ni personas.",
    "Pesquisar contexto externo": "Buscar contexto externo",
    "Escreve palavras-chave ou aceita a descrição do Gemini. Só o texto será enviado para a pesquisa; a imagem não será partilhada.": "Escribe palabras clave o usa la descripción de Gemini. Solo se envía texto a la búsqueda; la imagen no se comparte.",
    "Pesquisar imagens e notícias relacionadas": "Buscar imágenes y noticias relacionadas",
    "A escrever pelo menos 2 caracteres.": "Escribe al menos 2 caracteres.",
    "A pesquisar fontes...": "Buscando fuentes...",
    "Não foi possível pesquisar as fontes. Tenta novamente.": "No se pudieron buscar las fuentes. Inténtalo de nuevo.",
    "Imagens relacionadas": "Imágenes relacionadas",
    "Notícias relacionadas": "Noticias relacionadas",
    "Sem imagens relacionadas encontradas.": "No se encontraron imágenes relacionadas.",
    "Sem notícias encontradas.": "No se encontraron noticias.",
    "Pesquisa textual: estes resultados não confirmam correspondência visual.": "Búsqueda textual: estos resultados no confirman coincidencias visuales.",
    "A pesquisa de imagens está temporariamente indisponível.": "La búsqueda de imágenes no está disponible temporalmente.",
    Licença: "Licencia",
    "Licença:": "Licencia:",
    Criador: "Creador",
    "Criador:": "Creador:",
    Consulta: "Consulta de búsqueda",
    "Ver fonte": "Ver fuente",
    "Metadados da imagem": "Metadatos de la imagen",
    Fabricante: "Fabricante",
    Modelo: "Modelo",
    Software: "Software",
    "Data de captura": "Fecha de captura",
    "A imagem inclui dados de GPS; as coordenadas não são apresentadas.": "La imagen contiene datos GPS; no se muestran las coordenadas.",
    "Os metadados podem ser removidos ou alterados; não são prova de origem.": "Los metadatos pueden eliminarse o alterarse; no son prueba del origen.",
    "A pesquisa envia apenas o texto da consulta; a imagem não é enviada.": "Solo se envía el texto de búsqueda; no se envía la imagen.",
    "Fontes opcionais sem chave:": "Fuentes opcionales sin clave:",
    "Algumas fontes falharam:": "Algunas fuentes fallaron:",
    "Mapa manual": "Mapa manual",
    "Clica num país para o colorir. O mapa não mostra a origem nem a circulação de imagens.": "Haz clic en un país para colorearlo. El mapa no muestra el origen ni la circulación de imágenes.",
    Analisar: "Analizar",
    Histórico: "Historial",
    Ajuda: "Ayuda",
    Sobre: "Acerca de",
    Definições: "Ajustes",
    "Voltar para a pesquisa": "Volver a la búsqueda",
    "Voltar para o histórico": "Volver al historial",
    "Voltar para Definições": "Volver a Ajustes",
    "Voltar para Ajuda": "Volver a Ayuda",
    "Voltar para o resultado": "Volver al resultado",
    "Limpar histórico": "Borrar historial",
    "Limpar histórico?": "¿Borrar el historial?",
    "Queres apagar todo o histórico desta sessão?": "¿Quieres borrar todo el historial de esta sesión?",
    "O que vai apagar": "Qué se borrará",
    "As verificações e os resultados guardados nesta sessão.": "Las verificaciones y resultados guardados en esta sesión.",
    "O que não apaga": "Qué no se borrará",
    "As imagens originais não são guardadas pela Ektheto.": "Ektheto no guarda las imágenes originales.",
    Cancelar: "Cancelar",
    "Sim, limpar histórico": "Sí, borrar historial",
    "Como foi feita a pesquisa": "Cómo se hizo la verificación",
    "O que a Ektheto viu": "Qué detectó Ektheto",
    "Porque isto acontece": "Por qué ocurre",
    "O que isto não prova": "Qué no demuestra",
    "Toca em Voltar para ver os outros itens.": "Toca en Volver para ver los demás elementos.",
    "É uma estimativa, não uma prova. Confirma sempre com a fonte original.": "Es una estimación, no una prueba. Confirma siempre con la fuente original.",
    "Este resultado já não está disponível nesta sessão.": "Este resultado ya no está disponible en esta sesión.",
    "Portugal · Partilha": "Portugal · Compartido",
    "Angola · Origem": "Angola · Origen",
    "Brasil · Distribuidor": "Brasil · Distribuidor",
    "Escolhe o idioma": "Elige el idioma",
    Idioma: "Idioma",
    "Como analisar uma imagem?": "¿Cómo analizar una imagen?",
    "O que significa Ektheto?": "¿Qué significa Ektheto?",
    "O meu histórico fica guardado?": "¿Se guarda mi historial?",
    "Não. O histórico fica só nesta sessão e desaparece quando fechas o separador.": "No. El historial permanece solo en esta sesión y desaparece al cerrar la pestaña.",
    "Continuar tutorial": "Continuar tutorial",
    Tutorial: "Tutorial",
    "Passo 1 · Escolher imagem": "Paso 1 · Elegir imagen",
    "Passo 2 · Analisar": "Paso 2 · Analizar",
    "Passo 3 · Perceber o resultado": "Paso 3 · Entender el resultado",
    "Começar tutorial": "Empezar tutorial",
    "Ainda não fizeste nenhuma pesquisa nesta sessão.": "Aún no has hecho ninguna verificación en esta sesión.",
    Selecionado: "Seleccionado",
    "Sinais elevados de geração por IA": "Señales altas de generación por IA",
    "Poucos sinais de geração por IA": "Pocas señales de generación por IA",
    "Sinais inconclusivos": "Señales no concluyentes",
    "Histórico da sessão": "Historial de la sesión",
    "Português · Escolhe o idioma": "Portugués · Elige el idioma",
    "English · Escolhe o idioma": "English · Elige el idioma",
    "Español · Escolhe o idioma": "Español · Elige el idioma",
    "Expor o que é falso. Revelar o que é real.": "Exponer lo falso. Revelar lo real.",
    "Ferramentas": "Herramientas",
    Menu: "Menú",
    "Passos de apresentação": "Pasos de presentación",
    "Passos do tutorial": "Pasos del tutorial",
    "Pré-visualização da imagem escolhida": "Vista previa de la imagen seleccionada",
    "Voltar para Analisar imagem": "Volver a Analizar imagen",
    "Abrir menu": "Abrir menú",
    "Fechar menu": "Cerrar menú",
    "As verificações feitas nesta sessão.": "Comprobaciones realizadas en esta sesión.",
    "Resultado da pesquisa": "Resultado del análisis",
    "Resultado": "Resultado",
    "sinais de geração por IA": "señales de generación por IA",
    "geração por IA": "generación por IA",
    "sinais de manipulação facial": "señales de manipulación facial",
    "Manipulação facial": "Manipulación facial",
    "manipulação facial": "manipulación facial",
    "de confiança do modelo.": "de confianza del modelo.",
    "Ver ou limpar o histórico": "Ver o borrar el historial",
    "O que vimos na imagem antes de dar o resultado.": "Lo que observamos en la imagen antes de dar el resultado.",
    "Seleciona uma imagem e faz a análise para ver os resultados.": "Selecciona una imagen y analiza para ver los resultados.",
    "Um sinal sozinho pode enganar. O resultado é uma estimativa do modelo e deve ser interpretado com cuidado.": "Una señal por sí sola puede engañar. El resultado es una estimación del modelo y debe interpretarse con cuidado.",
    "Não é uma prova. Pode haver falsos positivos. Confirma sempre com a fonte original.": "No es una prueba. Puede haber falsos positivos. Confirma siempre con la fuente original.",
    "Teste - Porquê?": "Prueba: ¿por qué?",
    "Pele - Porquê?": "Piel: ¿por qué?",
    "Luz - Porquê?": "Luz: ¿por qué?",
    "Fundo - Porquê?": "Fondo: ¿por qué?",
    "Porque o teste completo cruza vários sinais antes de dar o resultado.": "La comprobación completa combina varias señales antes de dar un resultado.",
    "O resultado combina os indicadores fornecidos pelo modelo de análise.": "El resultado combina los indicadores proporcionados por el modelo de análisis.",
    "Um sinal sozinho pode enganar. Em conjunto, os indicadores ajudam a avaliar padrões da imagem.": "Una señal por sí sola puede engañar. En conjunto, los indicadores ayudan a evaluar patrones de la imagen.",
    "A pele pode mostrar padrões que ajudam a interpretar uma imagem.": "La piel puede mostrar patrones que ayudan a interpretar una imagen.",
    "O modelo devolve uma estimativa geral; não mede a pele de forma isolada.": "El modelo devuelve una estimación general; no analiza la piel de forma aislada.",
    "Textura, contornos e pequenos detalhes podem parecer diferentes em imagens sintetizadas ou comprimidas.": "La textura, los contornos y los pequeños detalles pueden verse distintos en imágenes sintéticas o comprimidas.",
    "A luz ajuda a perceber como os elementos da imagem se relacionam.": "La luz ayuda a entender cómo se relacionan los elementos de la imagen.",
    "A análise não fornece uma medição isolada da luz.": "El análisis no ofrece una medición aislada de la luz.",
    "Sombras e reflexos podem dar contexto, mas também mudam com edição, câmara e compressão.": "Las sombras y los reflejos aportan contexto, pero también cambian con la edición, la cámara y la compresión.",
    "O fundo também pode conter pistas importantes.": "El fondo también puede contener pistas importantes.",
    "A análise não fornece uma pontuação isolada para o fundo.": "El análisis no ofrece una puntuación aislada del fondo.",
    "Padrões e objetos ao fundo podem parecer inconsistentes, mas isso não confirma por si só que uma imagem foi gerada por IA.": "Los patrones y objetos del fondo pueden parecer inconsistentes, pero eso no confirma por sí solo que una imagen haya sido generada por IA.",
    "Analisar uma imagem": "Analizar una imagen",
    "Controlos do mapa": "Controles del mapa",
    "Cor do país": "Color del país",
    "Cor para pintar um país": "Color para rellenar un país",
    "Cor do oceano": "Color del océano",
    "Limpar mapa": "Restablecer mapa",
    "Exportar SVG": "Exportar SVG",
    "Mapa-múndi interativo. Clica ou toca num país para o colorir; usa a roda do rato para ampliar.": "Mapa mundial interactivo. Haz clic o toca un país para colorearlo; usa la rueda del ratón para ampliar.",
    "A carregar mapa...": "Cargando mapa...",
    "Cores originais restauradas.": "Se restauraron los colores originales.",
    "Mapa exportado em SVG.": "Mapa exportado como SVG.",
    "Não foi possível exportar o mapa. Tenta novamente.": "No se pudo exportar el mapa. Inténtalo de nuevo.",
    "Não foi possível carregar o mapa. Atualiza a página e tenta novamente.": "No se pudo cargar el mapa. Actualiza la página e inténtalo de nuevo.",
    "Escolhe uma imagem e toca em Analisar. A imagem é enviada apenas para fazer a verificação.": "Elige una imagen y toca Analizar. La imagen se envía únicamente para realizar la comprobación.",
    "A Ektheto procura sinais na imagem e ajuda-te a investigar cada detalhe.": "Ektheto busca señales en la imagen y te ayuda a investigar cada detalle.",
    "1 · Escolher uma imagem": "1 · Elegir una imagen",
    "2 · Pedir a análise": "2 · Solicitar el análisis",
    "3 · Ler o resultado": "3 · Leer el resultado",
    "Na página Analisar imagem, toca na caixa da galeria ou arrasta a fotografia para lá. A pré-visualização mostra a imagem escolhida.": "En la página Analizar imagen, toca el cuadro de la galería o arrastra una foto hasta allí. La vista previa muestra la imagen seleccionada.",
    "Confirma que escolheste a imagem certa e toca em Analisar. A imagem é enviada ao serviço de análise apenas para esta verificação.": "Confirma que elegiste la imagen correcta y toca Analizar. La imagen se envía al servicio de análisis solo para esta comprobación.",
    "Consulta a estimativa e abre Como foi feita a pesquisa para ver a explicação. Uma pontuação ajuda a investigar, mas não prova se a imagem é verdadeira ou falsa.": "Consulta la estimación y abre Cómo se hizo la comprobación para ver la explicación. Una puntuación ayuda a investigar, pero no demuestra si la imagen es verdadera o falsa.",
    "Escolher da galeria": "Elegir de la galería",
    "Escolhe o idioma da Ektheto.": "Elige el idioma de Ektheto.",
    "A Ektheto ajuda a investigar sinais numa imagem. O resultado é uma estimativa e não prova autenticidade.": "Ektheto ayuda a investigar señales en una imagen. El resultado es una estimación y no demuestra autenticidad.",
    "Formato não suportado. Escolhe JPG, JPEG, PNG, WEBP ou BMP.": "Formato no compatible. Elige JPG, JPEG, PNG, WEBP o BMP.",
    "A imagem excede o limite de 100 MB.": "La imagen supera el límite de 100 MB.",
    "A analisar…": "Analizando…",
    "A imagem está a ser analisada.": "Se está analizando la imagen.",
    "O resultado é uma estimativa e não prova a autenticidade da imagem.": "El resultado es una estimación y no demuestra la autenticidad de la imagen.",
    "O resultado é uma estimativa do modelo e não prova autenticidade.": "El resultado es una estimación del modelo y no demuestra autenticidad.",
    "O serviço de análise ainda não está ligado. O backend Render precisa de ser publicado e configurado.": "El servicio de análisis aún no está conectado. Hay que publicar y configurar el backend de Render.",
    "O servidor de análise não respondeu corretamente. Verifica se o backend Render está ativo.": "El servidor de análisis devolvió una respuesta inesperada. Comprueba que el backend de Render esté activo.",
    "Não foi possível contactar o serviço de análise. Verifica a ligação e tenta novamente.": "No se pudo contactar con el servicio de análisis. Comprueba la conexión e inténtalo de nuevo.",
    "A análise ainda não está configurada neste servidor.": "El análisis de imágenes aún no está configurado en este servidor.",
    "O serviço de análise rejeitou as credenciais.": "El servicio de análisis rechazó las credenciales.",
    "O serviço de análise rejeitou o pedido.": "El servicio de análisis rechazó la solicitud.",
    "A resposta do serviço de análise não é válida.": "El servicio de análisis devolvió una respuesta no válida.",
    "O limite de análises foi atingido. Tenta novamente mais tarde.": "Se alcanzó el límite de análisis. Inténtalo más tarde.",
    "O serviço está temporariamente indisponível.": "El servicio no está disponible temporalmente.",
    "A análise demorou demasiado. Tenta novamente.": "El análisis tardó demasiado. Inténtalo de nuevo.",
    "Escolhe uma imagem antes de continuar.": "Elige una imagen antes de continuar.",
    "A imagem excede a resolução máxima de 50 megapixels.": "La imagen supera la resolución máxima de 50 megapíxeles.",
    "Este formato de imagem não é suportado.": "Este formato de imagen no es compatible.",
    "Não foi possível validar a imagem. Experimenta outro ficheiro.": "No se pudo validar la imagen. Prueba con otro archivo.",
    "Não foi possível concluir a análise. Tenta novamente.": "No se pudo completar el análisis. Inténtalo de nuevo.",
    "Análise concluída": "Análisis completado",
  },
};

let slideIndex = 0;
let currentRoute = "analisar";
let selectedFile = null;
let previewUrl = null;
let tutorialStep = 0;
const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
const LANGUAGE_KEY = "ektheto-language";
const LANGUAGE_OPTIONS = ["Português", "English", "Español"];
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const translatableAttributes = ["alt", "aria-label", "placeholder", "title"];

function getLanguage() {
  const savedLanguage = localStorage.getItem(LANGUAGE_KEY)
    || sessionStorage.getItem(LANGUAGE_KEY);
  if (LANGUAGE_OPTIONS.includes(savedLanguage) && !localStorage.getItem(LANGUAGE_KEY)) {
    localStorage.setItem(LANGUAGE_KEY, savedLanguage);
  }
  return LANGUAGE_OPTIONS.includes(savedLanguage) ? savedLanguage : "Português";
}

function getDateLocale() {
  return {
    Português: "pt-PT",
    English: "en-GB",
    Español: "es-ES",
  }[getLanguage()];
}

function getHistory() {
  try {
    const value = JSON.parse(sessionStorage.getItem("ektheto-history") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  sessionStorage.setItem("ektheto-history", JSON.stringify(items));
}

function showSlide(index) {
  slideIndex = index;
  cover.hidden = true;
  appShell.hidden = true;
  onboarding.hidden = false;
  const slide = slides[index];
  document.querySelector("#onboarding-image").src = slide.image;
  document.querySelector("#onboarding-title").textContent = slide.title;
  document.querySelector("#onboarding-copy").textContent = slide.copy;
  document.querySelectorAll(".page-dots span").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === index);
  });
  document.querySelector("#onboarding-next").textContent = index === slides.length - 1 ? "Começar" : "Seguinte";
  applyTranslations();
}

function showApp(route = "analisar") {
  cover.hidden = true;
  onboarding.hidden = true;
  appShell.hidden = false;
  renderPage(route);
}

document.querySelector("[data-onboarding='1']").addEventListener("click", () => showSlide(0));
document.querySelector("#onboarding-next").addEventListener("click", () => {
  if (slideIndex < slides.length - 1) {
    showSlide(slideIndex + 1);
    return;
  }
  sessionStorage.setItem("ektheto-onboarded", "true");
  location.hash = "analisar";
  showApp();
});

function menuMarkup() {
  menu.innerHTML = tools.map(([route, label]) =>
    `<button type="button" data-route="${route}">${label}</button>`).join("");
}
menuMarkup();
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  menu.hidden = expanded;
});
menu.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) showApp(routeButton.dataset.route);
});
document.querySelector(".wordmark").addEventListener("click", () => showApp("analisar"));

function pageHeading(title, back = "analisar", backText = "Voltar para a pesquisa") {
  return `<button class="back-link" type="button" data-route="${back}"><span aria-hidden="true">‹</span>&nbsp;<span>${backText}</span></button><h1>${title}</h1>`;
}

function renderTools() {
  return `<nav class="tool-grid" aria-label="Ferramentas">${tools.map(([route, label]) => `
    <button class="tool" type="button" data-route="${route}">
      <span class="tool-icon">${toolIcons[route]}</span><span>${label}</span>
    </button>`).join("")}</nav>`;
}

function renderAnalyze() {
  const result = getHistory()[0];
  const resultHtml = result ? `
    <section class="result-preview" aria-live="polite">
      <h2>${escapeHtml(result.verdictText)}</h2>
      <p class="result-score">${Math.round(result.score * 100)}% <span>sinais de geração por IA</span></p>
      ${result.deepfakeScore == null ? "" : `<p>${Math.round(result.deepfakeScore * 100)}% <span>sinais de manipulação facial</span></p>`}
      <button class="secondary-button" type="button" data-route="resultado-${result.id}">Como foi feita a pesquisa</button>
    </section>` : "";
  pageContent.innerHTML = `
    <section class="page analyze-page">
      <h1>Analisar imagem</h1>
      <p class="page-intro">Escolhe uma imagem para verificar se tem sinais de IA.</p>
      <form id="image-form">
        <input id="image-input" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/bmp" />
        <label id="upload-zone" class="upload-zone" for="image-input" tabindex="0">
          <img id="preview" alt="Pré-visualização da imagem escolhida" hidden />
          <span id="upload-placeholder" class="upload-placeholder">
            <svg class="gallery-icon" viewBox="0 0 64 64" aria-hidden="true"><rect x="9" y="15" width="34" height="38" rx="5"/><path d="m13 43 9-10 7 7 5-4 9 10"/><circle cx="21" cy="25" r="3"/><path d="M22 11h29a5 5 0 0 1 5 5v32a5 5 0 0 1-5 5h-3"/></svg>
            <strong class="upload-title">Escolher imagem da galeria</strong>
            <span class="upload-copy">Arrasta a imagem para aqui ou toca para abrir a galeria.</span>
          </span>
        </label>
        <p id="file-details" class="file-details" aria-live="polite"></p>
        <label class="gemini-consent">
          <input id="gemini-consent" type="checkbox" />
          <span>
            <strong>Análise complementar com Gemini (opcional)</strong>
            <small>Se selecionares, a imagem também será enviada ao Google para análise complementar.</small>
          </span>
        </label>
        <button id="analyze-button" class="primary-button analyze-button" type="submit" disabled>Analisar</button>
      </form>
      <div class="upload-notes">
        <p class="format-note">JPG, JPEG, PNG, WEBP ou BMP · Até 100 MB · 50 MP</p>
        <p class="privacy-note">A Ektheto não guarda a imagem. A análise principal envia-a ao Sightengine; o Gemini só a recebe se selecionares a opção.</p>
      </div>
      ${resultHtml}
      ${renderTools()}
    </section>`;
  bindUpload();
  document.querySelector("#image-form").addEventListener("submit", analyzeSelectedImage);
}

function renderGeminiAssessment(result) {
  if (!result) return "";
  if (result.estado === "erro") {
    const messages = {
      gemini_not_configured: "Gemini não configurado. Adiciona a chave no servidor.",
      gemini_model_not_configured: "Modelo Gemini não disponível.",
      gemini_credentials_invalid: "Credenciais Gemini inválidas.",
      gemini_rate_limit: "Limite Gemini atingido. Tenta novamente mais tarde.",
      gemini_model_unavailable: "Modelo Gemini não disponível.",
      gemini_timeout: "Gemini demorou demasiado a responder.",
      gemini_unavailable: "Gemini temporariamente indisponível.",
      gemini_upstream_error: "Gemini temporariamente indisponível.",
      gemini_response_blocked: "Gemini devolveu uma resposta inválida.",
      gemini_invalid_response: "Gemini devolveu uma resposta inválida.",
      gemini_invalid_image: "Não foi possível concluir a análise complementar.",
    };
    return `<article class="info-card gemini-assessment"><h2>Análise complementar do Gemini</h2><p>${messages[result.codigo] || "Não foi possível concluir a análise complementar."}</p></article>`;
  }

  const assessment = result.avaliacao;
  if (result.estado !== "ok" || !assessment) return "";
  const renderList = (title, items) => {
    if (!Array.isArray(items) || items.length === 0) return "";
    return `<section class="gemini-list"><h3>${title}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
  };
  return `
    <article class="info-card gemini-assessment">
      <h2>Análise complementar do Gemini</h2>
      <h3>Descrição visual</h3><p>${escapeHtml(assessment.descricao)}</p>
      ${renderList("Texto visível", assessment.texto_visivel)}
      ${renderList("Pistas observadas", assessment.pistas_visuais)}
      ${renderList("Hipóteses para verificar", assessment.hipoteses)}
      ${renderList("Verificações sugeridas", assessment.verificacoes_sugeridas)}
      <h3>Limitações</h3><p>${escapeHtml(assessment.limitacoes)}</p>
      <p class="gemini-disclaimer">A análise do Gemini pode conter erros e não confirma autenticidade.</p>
    </article>`;
}

function renderImageMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return "";
  const fields = [
    ["Fabricante", metadata.camera_make],
    ["Modelo", metadata.camera_model],
    ["Software", metadata.software],
    ["Data de captura", metadata.captured_at],
  ].filter(([, value]) => typeof value === "string" && value.trim());
  if (metadata.gps_data_present) {
    fields.push(["GPS", "A imagem inclui dados de GPS; as coordenadas não são apresentadas."]);
  }
  if (!fields.length) return "";
  return `
    <article class="info-card image-metadata">
      <h2>Metadados da imagem</h2>
      <dl>${fields.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
      <p>Os metadados podem ser removidos ou alterados; não são prova de origem.</p>
    </article>`;
}

function renderSourceSearch(gemini) {
  const assessment = gemini?.estado === "ok" ? gemini.avaliacao : null;
  const query = assessment
    ? [assessment.descricao, ...(assessment.texto_visivel || []), ...(assessment.pistas_visuais || [])]
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 200)
    : "";
  return `
    <article class="info-card source-search">
      <h2>Pesquisar contexto externo</h2>
      <p>Escreve palavras-chave ou aceita a descrição do Gemini. Só o texto será enviado para a pesquisa; a imagem não será partilhada.</p>
      <label for="source-search-query">Consulta</label>
      <input id="source-search-query" type="search" maxlength="200" value="${escapeHtml(query)}">
      <button class="secondary-button" type="button" data-action="search-sources">Pesquisar imagens e notícias relacionadas</button>
      <p class="source-search-note">A pesquisa envia apenas o texto da consulta; a imagem não é enviada.</p>
      <p id="source-search-status" class="source-search-status" role="status" aria-live="polite"></p>
      <div id="source-search-results"></div>
    </article>`;
}

function renderSourceResults(payload) {
  const imageResults = payload.imagens?.resultados || [];
  const imageContent = payload.imagens?.estado === "erro"
    ? "<p>A pesquisa de imagens está temporariamente indisponível.</p>"
    : imageResults.length
      ? `<div class="source-image-grid">${imageResults.map((image) => `
          <article class="source-image">
            <img src="${escapeHtml(image.thumbnail_url)}" alt="${escapeHtml(image.title)}" loading="lazy" referrerpolicy="no-referrer">
            <div><h4>${escapeHtml(image.title)}</h4>
              ${image.license ? `<p>Licença: ${escapeHtml(image.license)}</p>` : ""}
              ${image.creator ? `<p>Criador: ${escapeHtml(image.creator)}</p>` : ""}
              <a href="${escapeHtml(image.source_url)}" target="_blank" rel="noopener noreferrer">Ver fonte</a>
            </div>
          </article>`).join("")}</div>`
      : "<p>Sem imagens relacionadas encontradas.</p>";

  const providers = Object.values(payload.noticias?.provedores || {});
  const stories = providers.flatMap((provider) => provider.artigos || []);
  const providerNames = {
    gdelt: "GDELT",
    newsdata: "NewsData",
    gnews: "GNews",
    newsapi: "NewsAPI",
  };
  const providerEntries = Object.entries(payload.noticias?.provedores || {});
  const unconfigured = providerEntries
    .filter(([, provider]) => provider.estado === "nao_configurado")
    .map(([name]) => providerNames[name] || name);
  const failed = providerEntries
    .filter(([, provider]) => provider.estado === "erro")
    .map(([name, provider]) => `${providerNames[name] || name}: ${provider.codigo || "erro"}`);
  const newsContent = stories.length
    ? `<ul class="source-news-list">${stories.map((story) => `
        <li><a href="${escapeHtml(story.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(story.titulo)}</a><span>${escapeHtml(story.fonte)}</span></li>`).join("")}</ul>`
    : "<p>Sem notícias encontradas.</p>";
  const newsStatus = [
    unconfigured.length
      ? `<p class="source-search-note"><span>Fontes opcionais sem chave:</span> ${escapeHtml(unconfigured.join(", "))}.</p>`
      : "",
    failed.length
      ? `<p class="source-search-note"><span>Algumas fontes falharam:</span> ${escapeHtml(failed.join("; "))}.</p>`
      : "",
  ].join("");

  return `
    <section class="source-results">
      <h3>Imagens relacionadas</h3>${imageContent}
      <h3>Notícias relacionadas</h3>${newsContent}${newsStatus}
      <p class="source-search-note">Pesquisa textual: estes resultados não confirmam correspondência visual.</p>
    </section>`;
}

async function searchInvestigationSources(button) {
  const input = pageContent.querySelector("#source-search-query");
  const status = pageContent.querySelector("#source-search-status");
  const results = pageContent.querySelector("#source-search-results");
  if (!input || !status || !results) return;
  const query = input?.value.trim() || "";
  if (query.length < 2) {
    status.textContent = "A escrever pelo menos 2 caracteres.";
    input?.focus();
    return;
  }

  button.disabled = true;
  status.textContent = "A pesquisar fontes...";
  results.replaceChildren();
  try {
    const response = await fetch(apiUrl("/api/investigation/sources"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.slice(0, 200), pais: "ao", limite: 3 }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "source_search_error");
    results.innerHTML = renderSourceResults(payload);
    status.textContent = "";
    applyTranslations();
  } catch (error) {
    console.error("Could not search investigation sources.", error);
    status.textContent = "Não foi possível pesquisar as fontes. Tenta novamente.";
  } finally {
    button.disabled = false;
  }
}

function renderHistory() {
  const items = getHistory();
  const list = items.length ? items.map((item) => `
    <button class="history-item" type="button" data-route="resultado-${item.id}">
      <span><strong>${escapeHtml(item.name)}</strong><small>${new Date(item.createdAt).toLocaleString(getDateLocale())}</small></span>
      <span class="history-result">${Math.round(item.score * 100)}%</span>
    </button>`).join("") : '<p class="empty-state">Ainda não fizeste nenhuma pesquisa nesta sessão.</p>';
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Histórico")}
      <p class="page-intro">As verificações feitas nesta sessão.</p>
      <div class="history-list">${list}</div>
      <button class="primary-button page-action" type="button" data-route="limpar-historico">Limpar histórico</button>
      <button class="secondary-button page-action" type="button" data-route="analisar">Voltar para Analisar imagem</button>
    </section>`;
}

function renderDeleteHistory() {
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Limpar histórico?", "historico", "Voltar para o histórico")}
      <p class="page-intro">Queres apagar todo o histórico desta sessão?</p>
      <article class="info-card"><h2>O que vai apagar</h2><p>As verificações e os resultados guardados nesta sessão.</p></article>
      <article class="info-card"><h2>O que não apaga</h2><p>As imagens originais não são guardadas pela Ektheto.</p></article>
      <div class="button-stack">
        <button class="secondary-button" type="button" data-route="historico">Cancelar</button>
        <button class="primary-button" type="button" data-action="clear-history">Sim, limpar histórico</button>
      </div>
    </section>`;
}

function renderWhy(result) {
  const score = result ? Math.round(result.score * 100) : null;
  const deepfake = result?.deepfakeScore == null ? null : Math.round(result.deepfakeScore * 100);
  const conjunction = { Português: "e", English: "and", Español: "y" }[getLanguage()];
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Como foi feita a pesquisa", "resultado-" + (result?.id || ""), "Voltar para o resultado")}
      <p class="page-intro">O que vimos na imagem antes de dar o resultado.</p>
      <article class="info-card"><h2>O que a Ektheto viu</h2><p>${score == null
    ? "Seleciona uma imagem e faz a análise para ver os resultados."
    : `<span>Resultado</span> ${score}% <span>geração por IA</span>${deepfake == null ? "." : ` <span>${conjunction}</span> ${deepfake}% <span>manipulação facial</span>.`}`}</p></article>
      <article class="info-card"><h2>Porque isto acontece</h2><p>Um sinal sozinho pode enganar. O resultado é uma estimativa do modelo e deve ser interpretado com cuidado.</p></article>
      <article class="info-card"><h2>O que isto não prova</h2><p>Não é uma prova. Pode haver falsos positivos. Confirma sempre com a fonte original.</p></article>
      <div class="detail-links">
        <button class="secondary-button" type="button" data-route="porque-teste">Teste - Porquê?</button>
        <button class="secondary-button" type="button" data-route="porque-pele">Pele - Porquê?</button>
        <button class="secondary-button" type="button" data-route="porque-luz">Luz - Porquê?</button>
        <button class="secondary-button" type="button" data-route="porque-fundo">Fundo - Porquê?</button>
      </div>
      <p class="touch-hint">Toca em Voltar para ver os outros itens.</p>
      <button class="primary-button page-action" type="button" data-route="resultado-${result?.id || ""}">Voltar para a pesquisa</button>
    </section>`;
}

function renderWhyDetail(topic) {
  const content = {
    teste: {
      title: "Teste - Porquê?",
      intro: "Porque o teste completo cruza vários sinais antes de dar o resultado.",
      viewed: "O resultado combina os indicadores fornecidos pelo modelo de análise.",
      why: "Um sinal sozinho pode enganar. Em conjunto, os indicadores ajudam a avaliar padrões da imagem.",
    },
    pele: {
      title: "Pele - Porquê?",
      intro: "A pele pode mostrar padrões que ajudam a interpretar uma imagem.",
      viewed: "O modelo devolve uma estimativa geral; não mede a pele de forma isolada.",
      why: "Textura, contornos e pequenos detalhes podem parecer diferentes em imagens sintetizadas ou comprimidas.",
    },
    luz: {
      title: "Luz - Porquê?",
      intro: "A luz ajuda a perceber como os elementos da imagem se relacionam.",
      viewed: "A análise não fornece uma medição isolada da luz.",
      why: "Sombras e reflexos podem dar contexto, mas também mudam com edição, câmara e compressão.",
    },
    fundo: {
      title: "Fundo - Porquê?",
      intro: "O fundo também pode conter pistas importantes.",
      viewed: "A análise não fornece uma pontuação isolada para o fundo.",
      why: "Padrões e objetos ao fundo podem parecer inconsistentes, mas isso não confirma por si só que uma imagem foi gerada por IA.",
    },
  }[topic];
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading(content.title, "porque-" + (getHistory()[0]?.id || ""), "Voltar para a pesquisa")}
      <p class="page-intro">${content.intro}</p>
      <article class="info-card"><h2>O que a Ektheto viu</h2><p>${content.viewed}</p></article>
      <article class="info-card"><h2>Porque isto acontece</h2><p>${content.why}</p></article>
      <article class="info-card"><h2>O que isto não prova</h2><p>É uma estimativa, não uma prova. Confirma sempre com a fonte original.</p></article>
      <p class="touch-hint">Toca em Voltar para ver os outros itens.</p>
      <button class="primary-button page-action" type="button" data-route="porque-${getHistory()[0]?.id || ""}">Voltar para a pesquisa</button>
    </section>`;
}

function renderResult(id) {
  const result = getHistory().find((item) => item.id === id);
  if (!result) {
    pageContent.innerHTML = `<section class="page">${pageHeading("Resultado")}<p class="empty-state">Este resultado já não está disponível nesta sessão.</p><button class="primary-button page-action" data-route="analisar">Voltar para Analisar imagem</button></section>`;
    return;
  }
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Resultado da pesquisa", "analisar", "Voltar para a pesquisa")}
      <p class="page-intro">${escapeHtml(result.name)}</p>
      <article class="info-card"><h2>${escapeHtml(result.verdictText)}</h2><p class="result-score">${Math.round(result.score * 100)}% <span>sinais de geração por IA</span></p></article>
      ${result.deepfakeScore == null ? "" : `<article class="info-card"><h2>Manipulação facial</h2><p>${Math.round(result.deepfakeScore * 100)}% <span>de confiança do modelo.</span></p></article>`}
      ${renderImageMetadata(result.metadata)}
      ${renderGeminiAssessment(result.gemini)}
      ${renderSourceSearch(result.gemini)}
      <button class="primary-button page-action" type="button" data-route="porque-${result.id}">Como foi feita a pesquisa</button>
    </section>`;
}

function renderRadar() {
  pageContent.innerHTML = `
    <section class="page radar-page">
      <h1>Mapa de investigação</h1>
      <p class="radar-intro">Mapa manual para organizar visualmente uma investigação. Não rastreia links, partilhas ou pessoas.</p>
      <figure class="radar-card radar-map-card">
        <div class="radar-map-toolbar" aria-label="Controlos do mapa">
          <label class="map-tool-group" for="radar-country-color">
            <span>Cor do país</span>
            <input id="radar-country-color" type="color" value="#ef4444" aria-label="Cor para pintar um país">
          </label>
          <label class="map-tool-group" for="radar-ocean-color">
            <span>Cor do oceano</span>
            <input id="radar-ocean-color" type="color" value="#cfe8fc" aria-label="Cor do oceano">
          </label>
          <button class="map-tool-button" id="radar-map-reset" type="button">Limpar mapa</button>
          <button class="map-tool-button" id="radar-map-export" type="button">Exportar SVG</button>
        </div>
        <div class="radar-map-viewport" id="radar-map-viewport">
          <svg id="radar-world-map" class="radar-illustration radar-world-map" viewBox="0 0 600 280" role="group" aria-label="Mapa-múndi interativo. Clica ou toca num país para o colorir; usa a roda do rato para ampliar."></svg>
          <div class="radar-map-tooltip" id="radar-map-tooltip" role="status" hidden></div>
        </div>
        <p class="radar-map-message" id="radar-map-message" role="status" aria-live="polite">A carregar mapa...</p>
      </figure>
      <article class="info-card">
        <h2>Mapa manual</h2>
        <p>Clica num país para o colorir. O mapa não mostra a origem nem a circulação de imagens.</p>
      </article>
      <button class="primary-button page-action" type="button" data-route="analisar">Analisar uma imagem</button>
    </section>`;
  bindRadarMap();
}

async function bindRadarMap() {
  const mapSvg = pageContent.querySelector("#radar-world-map");
  const viewport = pageContent.querySelector("#radar-map-viewport");
  const message = pageContent.querySelector("#radar-map-message");
  if (!mapSvg || !viewport || !message) return;

  const setMessage = (text) => {
    message.textContent = text;
    message.hidden = false;
  };

  try {
    const response = await fetch("/assets/world-map.svg");
    if (!response.ok) throw new Error(`Map request failed with status ${response.status}`);

    const source = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    const sourceSvg = source.documentElement;
    if (source.querySelector("parsererror") || sourceSvg.localName !== "svg") {
      throw new Error("The world map asset is not valid SVG.");
    }

    mapSvg.setAttribute("viewBox", sourceSvg.getAttribute("viewBox") || "0 0 600 280");
    mapSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const mapContent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mapContent.id = "radar-map-content";
    for (const child of sourceSvg.childNodes) {
      mapContent.appendChild(document.importNode(child, true));
    }
    mapSvg.replaceChildren(mapContent);

    const countriesOnMap = [...mapSvg.querySelectorAll("path.country")];
    if (!countriesOnMap.length || countriesOnMap.some((country) => !country.dataset.defaultFill || !country.dataset.name)) {
      throw new Error("The world map is missing country data.");
    }

    const countryColor = pageContent.querySelector("#radar-country-color");
    const oceanColor = pageContent.querySelector("#radar-ocean-color");
    const ocean = mapSvg.querySelector("#radar-map-ocean");
    const tooltip = pageContent.querySelector("#radar-map-tooltip");
    const resetButton = pageContent.querySelector("#radar-map-reset");
    const exportButton = pageContent.querySelector("#radar-map-export");
    if (!countryColor || !oceanColor || !ocean || !tooltip || !resetButton || !exportButton) {
      throw new Error("The world map controls could not be initialized.");
    }

    message.hidden = true;
    const colorCountry = (country) => country.setAttribute("fill", countryColor.value);
    const hideTooltip = () => {
      tooltip.hidden = true;
    };
    const showTooltip = (country, clientX, clientY) => {
      const bounds = viewport.getBoundingClientRect();
      tooltip.textContent = country.dataset.name;
      tooltip.style.left = `${Math.max(4, clientX - bounds.left + 10)}px`;
      tooltip.style.top = `${Math.max(4, clientY - bounds.top - 28)}px`;
      tooltip.hidden = false;
    };
    const eventPoint = (event) => {
      const matrix = mapSvg.getScreenCTM();
      if (!matrix) return null;
      const point = mapSvg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      return point.matrixTransform(matrix.inverse());
    };
    const zoom = { scale: 1, x: 0, y: 0 };
    const applyZoom = () => {
      zoom.x = Math.min(0, Math.max(600 * (1 - zoom.scale), zoom.x));
      zoom.y = Math.min(0, Math.max(280 * (1 - zoom.scale), zoom.y));
      mapContent.setAttribute("transform", `translate(${zoom.x} ${zoom.y}) scale(${zoom.scale})`);
    };
    let drag = null;

    mapSvg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const point = eventPoint(event);
      if (!point) return;
      const country = event.target instanceof Element ? event.target.closest("path.country") : null;
      drag = { pointerId: event.pointerId, point, x: zoom.x, y: zoom.y, country, moved: false };
      mapSvg.setPointerCapture(event.pointerId);
      mapSvg.classList.add("is-dragging");
    });

    mapSvg.addEventListener("pointermove", (event) => {
      const country = event.target instanceof Element ? event.target.closest("path.country") : null;
      if (country) showTooltip(country, event.clientX, event.clientY);
      else hideTooltip();

      if (!drag || drag.pointerId !== event.pointerId) return;
      const point = eventPoint(event);
      if (!point) return;
      if (!drag.moved && Math.hypot(point.x - drag.point.x, point.y - drag.point.y) > 3) drag.moved = true;
      if (drag.moved) {
        zoom.x = drag.x + point.x - drag.point.x;
        zoom.y = drag.y + point.y - drag.point.y;
        applyZoom();
      }
    });

    mapSvg.addEventListener("pointerup", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved && drag.country) colorCountry(drag.country);
      drag = null;
      mapSvg.classList.remove("is-dragging");
    });

    mapSvg.addEventListener("pointercancel", () => {
      drag = null;
      mapSvg.classList.remove("is-dragging");
    });

    mapSvg.addEventListener("pointerleave", hideTooltip);
    mapSvg.addEventListener("focusin", (event) => {
      const country = event.target instanceof Element ? event.target.closest("path.country") : null;
      if (!country) return;
      const bounds = country.getBoundingClientRect();
      showTooltip(country, bounds.left + bounds.width / 2, bounds.top);
    });
    mapSvg.addEventListener("focusout", hideTooltip);
    mapSvg.addEventListener("keydown", (event) => {
      const country = event.target instanceof Element ? event.target.closest("path.country") : null;
      if (!country || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      colorCountry(country);
    });

    mapSvg.addEventListener("wheel", (event) => {
      event.preventDefault();
      const point = eventPoint(event);
      if (!point) return;
      const previousScale = zoom.scale;
      zoom.scale = Math.min(8, Math.max(1, zoom.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const scaleRatio = zoom.scale / previousScale;
      zoom.x = point.x - (point.x - zoom.x) * scaleRatio;
      zoom.y = point.y - (point.y - zoom.y) * scaleRatio;
      applyZoom();
    }, { passive: false });

    resetButton.addEventListener("click", () => {
      countriesOnMap.forEach((country) => country.setAttribute("fill", country.dataset.defaultFill));
      setMessage("Cores originais restauradas.");
    });
    oceanColor.addEventListener("input", () => {
      ocean.setAttribute("fill", oceanColor.value);
    });
    exportButton.addEventListener("click", () => {
      try {
        const exportMap = mapSvg.cloneNode(true);
        exportMap.setAttribute("width", "1200");
        exportMap.setAttribute("height", "560");
        const svg = new XMLSerializer().serializeToString(exportMap);
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "ektheto-radar-mapa.svg";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        setMessage("Mapa exportado em SVG.");
      } catch (error) {
        console.error("Could not export the radar map.", error);
        setMessage("Não foi possível exportar o mapa. Tenta novamente.");
      }
    });
  } catch (error) {
    console.error("Could not load the radar map.", error);
    setMessage("Não foi possível carregar o mapa. Atualiza a página e tenta novamente.");
  }
}

function renderHelp() {
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Ajuda")}
      <article class="info-card"><h2>Como analisar uma imagem?</h2><p>Escolhe uma imagem e toca em Analisar. A imagem é enviada apenas para fazer a verificação.</p></article>
      <article class="info-card"><h2>O que significa Ektheto?</h2><p>A Ektheto procura sinais na imagem e ajuda-te a investigar cada detalhe.</p></article>
      <article class="info-card"><h2>O meu histórico fica guardado?</h2><p>Não. O histórico fica só nesta sessão e desaparece quando fechas o separador.</p></article>
      <button class="primary-button page-action" type="button" data-route="tutorial">Continuar tutorial</button>
    </section>`;
}

function renderTutorial(step = tutorialStep) {
  tutorialStep = Math.max(0, Math.min(step, 2));
  const steps = [
    {
      title: "1 · Escolher uma imagem",
      copy: "Na página Analisar imagem, toca na caixa da galeria ou arrasta a fotografia para lá. A pré-visualização mostra a imagem escolhida.",
      example: '<span class="tutorial-gallery-icon">▧</span><strong>Escolher da galeria</strong>',
    },
    {
      title: "2 · Pedir a análise",
      copy: "Confirma que escolheste a imagem certa e toca em Analisar. A imagem é enviada ao serviço de análise apenas para esta verificação.",
      example: '<span class="tutorial-example-button">Analisar</span>',
    },
    {
      title: "3 · Ler o resultado",
      copy: "Consulta a estimativa e abre Como foi feita a pesquisa para ver a explicação. Uma pontuação ajuda a investigar, mas não prova se a imagem é verdadeira ou falsa.",
      example: '<span class="tutorial-score">87%</span><small>Exemplo visual — não é uma análise real.</small>',
    },
  ];
  const current = steps[tutorialStep];
  pageContent.innerHTML = `
    <section class="page tutorial-page">
      ${pageHeading("Tutorial", "ajuda", "Voltar para Ajuda")}
      <p class="tutorial-progress"><span>Passo</span> ${tutorialStep + 1} <span>de</span> ${steps.length}</p>
      <div class="page-dots" aria-label="Passos do tutorial">${steps.map((_, index) => `<span class="${index === tutorialStep ? "active" : ""}"></span>`).join("")}</div>
      <article class="tutorial-card">
        <h2>${current.title}</h2>
        <p>${current.copy}</p>
        <div class="tutorial-example">${current.example}</div>
      </article>
      <div class="tutorial-controls">
        <button class="secondary-button" type="button" data-tutorial-action="back" ${tutorialStep === 0 ? "disabled" : ""}>Recuar</button>
        <button class="primary-button" type="button" data-tutorial-action="next">${tutorialStep === steps.length - 1 ? "Concluir" : "Seguir"}</button>
      </div>
      <button class="tutorial-skip" type="button" data-tutorial-action="skip">Pular tutorial</button>
    </section>`;
}

function renderAbout() {
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Sobre")}
      <p class="about-tagline">Investigar com cuidado. Verificar com fontes.</p>
      <p class="page-intro">A Ektheto ajuda a investigar sinais numa imagem. O resultado é uma estimativa e não prova autenticidade.</p>
      <button class="primary-button page-action" type="button" data-route="analisar">Voltar para Analisar imagem</button>
    </section>`;
}

function renderSettings() {
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Definições")}
      <button class="settings-item" type="button" data-route="idioma"><strong>Idioma</strong><span>${getLanguage()} · Escolhe o idioma</span></button>
      <button class="settings-item" type="button" data-route="historico"><strong>Histórico da sessão</strong><span>Ver ou limpar o histórico</span></button>
      <button class="primary-button page-action" type="button" data-route="analisar">Voltar para Analisar imagem</button>
    </section>`;
}

function renderLanguage() {
  const current = getLanguage();
  pageContent.innerHTML = `
    <section class="page">
      ${pageHeading("Idioma", "definicoes", "Voltar para Definições")}
      <p class="page-intro">Escolhe o idioma da Ektheto.</p>
      <div class="choice-list">
        ${["Português", "English", "Español"].map((language) => `<button class="choice-item language-option ${current === language ? "selected" : ""}" type="button" data-language="${language}"><strong>${language}</strong><span>${current === language ? "Selecionado" : ""}</span></button>`).join("")}
      </div>
      <button class="primary-button page-action" type="button" data-route="definicoes">Voltar para Definições</button>
    </section>`;
}

function renderPage(route) {
  currentRoute = route;
  menu.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  appShell.classList.toggle("radar-shell", route === "radar");
  menuMarkup();
  location.hash = route;
  if (route === "analisar") renderAnalyze();
  else if (route === "historico") renderHistory();
  else if (route === "limpar-historico") renderDeleteHistory();
  else if (route === "radar") renderRadar();
  else if (route === "ajuda") renderHelp();
  else if (route === "tutorial") renderTutorial(0);
  else if (route === "sobre") renderAbout();
  else if (route === "definicoes") renderSettings();
  else if (route === "idioma") renderLanguage();
  else if (["teste", "pele", "luz", "fundo"].includes(route.slice(7)) && route.startsWith("porque-")) renderWhyDetail(route.slice(7));
  else if (route.startsWith("porque-")) renderWhy(getHistory().find((item) => item.id === route.slice(7)));
  else if (route.startsWith("resultado-")) renderResult(route.slice(10));
  else renderAnalyze();
  applyTranslations();
  window.scrollTo(0, 0);
}

function applyTranslations() {
  const locale = getLanguage();
  document.documentElement.lang = locale === "English" ? "en" : locale === "Español" ? "es" : "pt";
  document.querySelector("#cover-language").value = locale;
  const dictionary = translations[locale];
  translateSubtree(document.body, dictionary);
}

function translateSubtree(node, dictionary) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node);
    const translated = dictionary?.[source] || source;
    if (node.nodeValue !== translated) node.nodeValue = translated;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  let sourceAttributes = originalAttributes.get(node);
  if (!sourceAttributes) {
    sourceAttributes = new Map();
    originalAttributes.set(node, sourceAttributes);
  }
  for (const attribute of translatableAttributes) {
    const value = node.getAttribute(attribute);
    if (value === null) continue;
    if (!sourceAttributes.has(attribute)) sourceAttributes.set(attribute, value);
    const source = sourceAttributes.get(attribute);
    const translated = dictionary?.[source] || source;
    if (value !== translated) node.setAttribute(attribute, translated);
  }
  for (const child of node.childNodes) translateSubtree(child, dictionary);
}

const translationObserver = new MutationObserver((mutations) => {
  const dictionary = translations[getLanguage()];
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) translateSubtree(node, dictionary);
  }
});
translationObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener("storage", (event) => {
  if (event.key === LANGUAGE_KEY) applyTranslations();
});

document.querySelector("#cover-language").addEventListener("change", (event) => {
  localStorage.setItem(LANGUAGE_KEY, event.currentTarget.value);
  applyTranslations();
});

pageContent.addEventListener("click", (event) => {
  const searchSourcesButton = event.target.closest('[data-action="search-sources"]');
  if (searchSourcesButton) {
    searchInvestigationSources(searchSourcesButton);
    return;
  }
  const tutorialButton = event.target.closest("[data-tutorial-action]");
  if (tutorialButton) {
    const action = tutorialButton.dataset.tutorialAction;
    if (action === "back") renderTutorial(tutorialStep - 1);
    else if (action === "skip" || tutorialStep === 2) showApp("analisar");
    else renderTutorial(tutorialStep + 1);
    return;
  }
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    showApp(routeButton.dataset.route);
    return;
  }
  const clearButton = event.target.closest('[data-action="clear-history"]');
  if (clearButton) {
    saveHistory([]);
    showApp("historico");
    return;
  }
  const languageButton = event.target.closest("[data-language]");
  if (languageButton) {
    localStorage.setItem(LANGUAGE_KEY, languageButton.dataset.language);
    showApp("idioma");
    return;
  }
});

function bindUpload() {
  const input = document.querySelector("#image-input");
  const zone = document.querySelector("#upload-zone");
  const preview = document.querySelector("#preview");
  const details = document.querySelector("#file-details");
  const button = document.querySelector("#analyze-button");

  function reset() {
    selectedFile = null;
    preview.hidden = true;
    document.querySelector("#upload-placeholder").hidden = false;
    zone.classList.remove("has-image");
    button.disabled = true;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    details.textContent = "";
    if (!file) return reset();
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
    const validExtension = /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !validExtension) {
      reset();
      details.textContent = "Formato não suportado. Escolhe JPG, JPEG, PNG, WEBP ou BMP.";
      input.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reset();
      details.textContent = "A imagem excede o limite de 100 MB.";
      input.value = "";
      return;
    }
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
    document.querySelector("#upload-placeholder").hidden = true;
    zone.classList.add("has-image");
    details.textContent = `${file.name} · ${humanSize(file.size)}`;
    button.disabled = false;
  });

  zone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  });

  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("dragging");
    const [file] = event.dataTransfer.files;
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change"));
  });
}

async function analyzeSelectedImage(event) {
  event.preventDefault();
  if (!selectedFile) return;
  const button = document.querySelector("#analyze-button");
  const status = document.querySelector("#file-details");
  button.disabled = true;
  button.textContent = "A analisar…";
  status.textContent = "A imagem está a ser analisada.";
  const body = new FormData();
  body.append("file", selectedFile);
  body.append("use_gemini", String(Boolean(document.querySelector("#gemini-consent")?.checked)));
  const locale = getLanguage();
  body.append("language", locale === "English" ? "en" : locale === "Español" ? "es" : "pt");
  try {
    if (!API_BASE_URL && !IS_LOCAL_HOST) throw new Error("api_not_configured");
    const response = await fetch(apiUrl("/api/analyze"), { method: "POST", body });
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("api_unavailable");
    }
    if (!response.ok) throw new Error(payload.detail || "analysis_error");
    const verdictText = {
      high: "Sinais elevados de geração por IA",
      low: "Poucos sinais de geração por IA",
      inconclusive: "Sinais inconclusivos",
    }[payload.verdict] || "Análise concluída";
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: selectedFile.name,
      score: Number(payload.score),
      verdict: payload.verdict,
      verdictText,
      deepfakeScore: payload.deepfake_score == null ? null : Number(payload.deepfake_score),
      metadata: payload.metadata || null,
      gemini: payload.gemini || null,
      createdAt: new Date().toISOString(),
    };
    saveHistory([item, ...getHistory()]);
    renderAnalyze();
    const currentResult = pageContent.querySelector(".result-preview");
    if (currentResult) {
      const disclaimer = document.createElement("p");
      disclaimer.className = "result-disclaimer";
      disclaimer.textContent = "O resultado é uma estimativa do modelo e não prova autenticidade.";
      currentResult.append(disclaimer);
    }
  } catch (error) {
    const messages = {
      api_not_configured: "O serviço de análise ainda não está ligado. O backend Render precisa de ser publicado e configurado.",
      api_unavailable: "O servidor de análise não respondeu corretamente. Verifica se o backend Render está ativo.",
      analysis_not_configured: "A análise ainda não está configurada neste servidor.",
      credentials: "O serviço de análise rejeitou as credenciais.",
      provider: "O serviço de análise rejeitou o pedido.",
      invalid_response: "A resposta do serviço de análise não é válida.",
      rate_limit: "O limite de análises foi atingido. Tenta novamente mais tarde.",
      unavailable: "O serviço está temporariamente indisponível.",
      timeout: "A análise demorou demasiado. Tenta novamente.",
      network: "Não foi possível contactar o serviço de análise. Verifica a ligação e tenta novamente.",
      empty: "Escolhe uma imagem antes de continuar.",
      size: "A imagem excede o limite de 100 MB.",
      dimensions: "A imagem excede a resolução máxima de 50 megapixels.",
      format: "Este formato de imagem não é suportado.",
      invalid: "Não foi possível validar a imagem. Experimenta outro ficheiro.",
    };
    const errorCode = error instanceof TypeError ? "network" : String(error.message);
    status.textContent = messages[errorCode] || "Não foi possível concluir a análise. Tenta novamente.";
    button.disabled = false;
  } finally {
    const currentButton = document.querySelector("#analyze-button");
    if (currentButton) currentButton.textContent = "Analisar";
  }
}

function humanSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

if (location.hash) {
  showApp(decodeURIComponent(location.hash.slice(1)));
} else if (sessionStorage.getItem("ektheto-onboarded")) {
  showApp("analisar");
} else {
  cover.hidden = false;
}
applyTranslations();

window.addEventListener("hashchange", () => {
  const route = decodeURIComponent(location.hash.slice(1));
  if (route && route !== currentRoute && appShell.hidden === false) renderPage(route);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
