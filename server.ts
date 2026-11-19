import 'dotenv/config';
import crypto from 'node:crypto';
import net from 'node:net';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import sharp from 'sharp';
import {
  calculateEvidenceStrengthScore,
  getIndependentDirectEvidenceSources,
  isOfficialInstitutionalHost,
  MIN_CORROBORATION_RELEVANCE,
} from './src/utils/evidence';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

type ServerLang = 'en' | 'pt' | 'es';
type SealStatus =
  | 'unverified'
  | 'verified_public_sources'
  | 'out_of_context'
  | 'exaggerated'
  | 'false_claim';
type SourceTrustTier =
  | 'fact_checker'
  | 'official_institutional'
  | 'established_press'
  | 'web_source';

interface RssArticle {
  id: string;
  title: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  link: string;
  imageUrl?: string;
}

interface MatchedSourceItem {
  title: string;
  source: string;
  publishedAt: string;
  link: string;
  snippet?: string;
  isFactCheck?: boolean;
  trustTier?: SourceTrustTier;
  relevanceScore?: number;
  claimOverlapScore?: number;
  evidenceRelation?: 'direct_support' | 'direct_refutation' | 'related_only' | 'insufficient';
}

interface FactCheckEntry {
  claimText: string;
  claimant?: string;
  publisher: string;
  rating: string;
  url: string;
  reviewDate?: string;
}

function normalizeLang(input: unknown): ServerLang {
  if (input === 'pt' || input === 'es' || input === 'en') return input;
  return 'en';
}

const SERVER_MESSAGES: Record<
  ServerLang,
  {
    newsError: string;
    emptyInputError: string;
    verifiedLabel: string;
    unverifiedLabel: string;
    outOfContextLabel: string;
    exaggeratedLabel: string;
    falseLabel: string;
    certaintyConfirmed: string;
    certaintyNoEvidence: string;
    certaintyOutOfContext: string;
    certaintyExaggerated: string;
    certaintyFalse: string;
    notAvailable: string;
    noteConfirmed: (n: number) => string;
    noteFalse: string;
    noteOutOfContext: string;
    noteExaggerated: string;
    noteOneSource: string;
    noteNoMedia: string;
    mediaExtractionFailed: string;
    noteNoSources: string;
    noteCutoffInsufficient: string;
    noteInsufficientCorroboration: string;
    dateWarningOld: (days: number) => string;
  }
> = {
  en: {
    newsError: 'Unable to load real news right now',
    emptyInputError: 'Please paste a link, write text/rumor, or upload a file to verify.',
    verifiedLabel: 'Confirmed by multiple sources',
    unverifiedLabel: 'Unverified',
    outOfContextLabel: 'Out of context / Misleading',
    exaggeratedLabel: 'Exaggerated / Overstated',
    falseLabel: 'False',
    certaintyConfirmed: 'Confirmed by multiple sources',
    certaintyNoEvidence: 'Insufficient evidence',
    certaintyOutOfContext: 'Out of context',
    certaintyExaggerated: 'Exaggerated',
    certaintyFalse: 'False',
    notAvailable: 'not available',
    noteConfirmed: (n: number) => `Found ${n} credible public sources confirming the same story.`,
    noteFalse:
      'Certified fact-checkers or public news sources indicate this claim is false or debunked.',
    noteOutOfContext:
      'Related public news exists, but the claim distorts context or mixes facts.',
    noteExaggerated:
      'A partial factual basis exists, but the wording or numbers are significantly exaggerated.',
    noteOneSource:
      'Only 1 source met the strong-match and independence criteria. Other related sources may be listed, but they do not count as corroboration; the claim remains unverified, not disproved.',
    noteNoMedia: 'No public sources were found confirming this media file.',
    mediaExtractionFailed:
      'Could not extract readable text or a clear claim from this media file. No verification was performed; provide a transcript, caption, or clearer file.',
    noteNoSources: 'No real public sources were found confirming this claim or rumor.',
    noteCutoffInsufficient:
      'No retrieved documents passed the minimum relevance quality threshold. Insufficient verified evidence to confirm.',
    noteInsufficientCorroboration:
      'Retrieved results do not provide two sufficiently relevant, independent credible sources confirming this exact claim. The verdict is unverified; this does not mean the claim is false.',
    dateWarningOld: (days: number) =>
      `Source publication date is ${days} days old, while the message frames it as current/urgent.`,
  },
  pt: {
    newsError: 'Não foi possível carregar notícias reais agora',
    emptyInputError: 'Por favor, cole um link, texto, boato ou carregue um ficheiro para verificar.',
    verifiedLabel: 'Confirmado por múltiplas fontes',
    unverifiedLabel: 'Não verificado',
    outOfContextLabel: 'Fora de contexto / Enganoso',
    exaggeratedLabel: 'Exagerado / Distorcido',
    falseLabel: 'Falso',
    certaintyConfirmed: 'Confirmado por múltiplas fontes',
    certaintyNoEvidence: 'Evidência insuficiente',
    certaintyOutOfContext: 'Fora de contexto',
    certaintyExaggerated: 'Exagerado',
    certaintyFalse: 'Falso',
    notAvailable: 'não disponível',
    noteConfirmed: (n: number) => `Encontradas ${n} fontes públicas credíveis a confirmar a história.`,
    noteFalse:
      'Agências de checagem ou fontes jornalísticas indicam que esta afirmação é falsa ou boato.',
    noteOutOfContext:
      'Existem notícias com termos parecidos, mas a afirmação está fora de contexto ou mistura factos.',
    noteExaggerated:
      'Existe um fundo factual parcial, mas os números ou afirmações foram significativamente exagerados.',
    noteOneSource:
      'Apenas 1 fonte cumpriu os critérios de correspondência forte e independência. Outras fontes relacionadas podem aparecer na lista, mas não contam como corroboração; a alegação continua não verificada, não refutada.',
    noteNoMedia: 'Não foram encontradas fontes públicas que confirmem este ficheiro multimédia.',
    mediaExtractionFailed:
      'Não foi possível extrair texto legível ou uma alegação clara deste ficheiro multimédia. A verificação não foi realizada; forneça uma transcrição, legenda ou ficheiro mais nítido.',
    noteNoSources: 'Não foram encontradas fontes públicas reais que confirmem esta afirmação ou fofoca.',
    noteCutoffInsufficient:
      'Nenhum resultado atingiu o corte mínimo de relevância. Sem provas verificadas suficientes para confirmar.',
    noteInsufficientCorroboration:
      'Os resultados não apresentam duas fontes credíveis, independentes e suficientemente relevantes que confirmem esta alegação exata. O veredito é não verificado; isso não significa que a alegação seja falsa.',
    dateWarningOld: (days: number) =>
      `A publicação original tem ${days} dias, mas o texto apresenta o caso como urgente ou atual.`,
  },
  es: {
    newsError: 'No fue posible cargar noticias reales ahora',
    emptyInputError: 'Por favor, pega un enlace, texto, rumor o sube un archivo para verificar.',
    verifiedLabel: 'Confirmado por múltiples fuentes',
    unverifiedLabel: 'No verificado',
    outOfContextLabel: 'Fuera de contexto / Engañoso',
    exaggeratedLabel: 'Exagerado / Distorsionado',
    falseLabel: 'Falso',
    certaintyConfirmed: 'Confirmado por múltiples fuentes',
    certaintyNoEvidence: 'Evidencia insuficiente',
    certaintyOutOfContext: 'Fuera de contexto',
    certaintyExaggerated: 'Exagerado',
    certaintyFalse: 'Falso',
    notAvailable: 'no disponible',
    noteConfirmed: (n: number) => `Se encontraron ${n} fuentes públicas creíbles que confirman la historia.`,
    noteFalse:
      'Verificadores de hechos o medios públicos indican que esta afirmación es falsa o un bulo.',
    noteOutOfContext:
      'Existen noticias con palabras similares, pero el mensaje está fuera de contexto o mezcla hechos.',
    noteExaggerated:
      'Existe cierta base real, pero las cifras o afirmaciones han sido exageradas significativamente.',
    noteOneSource:
      'Solo 1 fuente cumplió los criterios de coincidencia fuerte e independencia. Pueden aparecer otras fuentes relacionadas, pero no cuentan como corroboración; la afirmación sigue sin verificarse, no refutada.',
    noteNoMedia: 'No se encontraron fuentes públicas que confirmen este archivo multimedia.',
    mediaExtractionFailed:
      'No se pudo extraer texto legible ni una afirmación clara de este archivo multimedia. No se realizó la verificación; proporciona una transcripción, un subtítulo o un archivo más nítido.',
    noteNoSources: 'No se encontraron fuentes públicas reales que confirmen este contenido o rumor.',
    noteCutoffInsufficient:
      'Ningún documento superó el umbral mínimo de relevancia. No hay evidencia suficiente para confirmar.',
    noteInsufficientCorroboration:
      'Los resultados no aportan dos fuentes creíbles, independientes y suficientemente relevantes que confirmen esta afirmación exacta. El veredicto no está verificado; esto no significa que la afirmación sea falsa.',
    dateWarningOld: (days: number) =>
      `La publicación original tiene ${days} días, aunque el mensaje la presenta como urgente o actual.`,
  },
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' '));
}

function extractTag(block: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function extractSourceTag(block: string): { name: string; url: string } {
  const match = block.match(/<source(?:\s+url="([^"]*)")?[^>]*>([\s\S]*?)<\/source>/i);
  if (!match) return { name: '', url: '' };
  return {
    url: decodeHtmlEntities(match[1] || ''),
    name: stripTags(match[2] || ''),
  };
}

function extractRssImageUrl(block: string): string | undefined {
  const candidates: string[] = [];

  const mediaContentMatch = block.match(/<media:content\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  if (mediaContentMatch?.[1]) candidates.push(mediaContentMatch[1]);

  const mediaThumbMatch = block.match(/<media:thumbnail\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  if (mediaThumbMatch?.[1]) candidates.push(mediaThumbMatch[1]);

  const enclosureMatch = block.match(/<enclosure\b[^>]*>/i);
  if (enclosureMatch) {
    const tag = enclosureMatch[0];
    const typeMatch = tag.match(/\btype=["']([^"']+)["']/i);
    const urlMatch = tag.match(/\burl=["']([^"']+)["']/i);
    if (urlMatch?.[1] && (!typeMatch || typeMatch[1].toLowerCase().startsWith('image/'))) {
      candidates.push(urlMatch[1]);
    }
  }

  const itunesMatch = block.match(/<itunes:image\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  if (itunesMatch?.[1]) candidates.push(itunesMatch[1]);

  const imgMatch = block.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (imgMatch?.[1]) candidates.push(imgMatch[1]);

  for (const raw of candidates) {
    const clean = decodeHtmlEntities(raw).trim();
    if (!/^https?:\/\//i.test(clean)) continue;
    const lower = clean.toLowerCase();
    if (
      lower.includes('1x1') ||
      lower.includes('pixel') ||
      lower.includes('doubleclick') ||
      lower.includes('feeds.feedburner.com/~ff') ||
      lower.includes('googleusercontent.com/news/')
    ) {
      continue;
    }
    return clean;
  }
  return undefined;
}

function parseRssXml(xml: string, fallbackSource: string): RssArticle[] {
  const items: RssArticle[] = [];
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

  for (const rawItem of itemMatches) {
    let title = stripTags(extractTag(rawItem, 'title'));
    let link = stripTags(extractTag(rawItem, 'link'));
    if (!link) {
      const atomLink = rawItem.match(/<link[^>]+href="([^"]+)"/i);
      if (atomLink) link = decodeHtmlEntities(atomLink[1]);
    }
    const pubDateRaw =
      stripTags(extractTag(rawItem, 'pubDate')) ||
      stripTags(extractTag(rawItem, 'published')) ||
      stripTags(extractTag(rawItem, 'updated')) ||
      stripTags(extractTag(rawItem, 'dc:date'));

    const sourceTag = extractSourceTag(rawItem);
    let source = sourceTag.name || fallbackSource;

    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, title.length - (` - ${source}`).length).trim();
    } else if (!sourceTag.name) {
      const splitIdx = title.lastIndexOf(' - ');
      if (splitIdx > 20 && title.length - splitIdx < 45) {
        const possibleSource = title.slice(splitIdx + 3).trim();
        if (possibleSource) {
          source = possibleSource;
          title = title.slice(0, splitIdx).trim();
        }
      }
    }

    if (!title || !link || !/^https?:\/\//i.test(link)) {
      continue;
    }

    let isoDate = '';
    if (pubDateRaw) {
      const parsed = new Date(pubDateRaw);
      if (!Number.isNaN(parsed.getTime())) {
        isoDate = parsed.toISOString();
      }
    }

    const imageUrl = extractRssImageUrl(rawItem);

    items.push({
      id: crypto.createHash('sha256').update(link).digest('base64url').slice(0, 20),
      title,
      source: source || 'Public source',
      sourceUrl: sourceTag.url || undefined,
      publishedAt: isoDate || new Date().toISOString(),
      link,
      ...(imageUrl ? { imageUrl } : {}),
    });
  }

  return items;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ektheto/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/json, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,pt-PT;q=0.8,es;q=0.7',
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRssFeed(url: string, fallbackSource: string): Promise<RssArticle[]> {
  try {
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || (!text.includes('<item') && !text.includes('<entry'))) return [];
    return parseRssXml(text, fallbackSource);
  } catch {
    return [];
  }
}

function getCountryFeedUrls(country: string, lang: ServerLang): Array<{ url: string; source: string }> {
  const normalized = country.trim().toLowerCase();

  if (lang === 'en') {
    if (normalized === 'angola') {
      return [
        { url: 'https://news.google.com/rss/search?q=Angola+-prison+-rodeo+-louisiana&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
        { url: 'https://news.google.com/rss/search?q=Luanda+OR+%22Angola+Africa%22&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
        { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', source: 'BBC News Africa' },
      ];
    }
    if (normalized === 'brasil' || normalized === 'brazil') {
      return [
        { url: 'https://news.google.com/rss/search?q=Brazil&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
        { url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml', source: 'BBC News' },
      ];
    }
    if (normalized === 'portugal') {
      return [
        { url: 'https://news.google.com/rss/search?q=Portugal&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
        { url: 'https://www.euronews.com/rss', source: 'Euronews' },
      ];
    }
    if (normalized === 'moçambique' || normalized === 'mocambique' || normalized === 'mozambique') {
      return [
        { url: 'https://news.google.com/rss/search?q=Mozambique&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
        { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', source: 'BBC News Africa' },
      ];
    }
    if (normalized === 'cabo verde' || normalized === 'cape verde') {
      return [
        { url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+OR+%22Cabo+Verde%22&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
      ];
    }
    if (normalized.includes('guinea') || normalized.includes('guiné') || normalized.includes('guine')) {
      return [
        { url: 'https://news.google.com/rss/search?q=%22Guinea-Bissau%22&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
      ];
    }
    if (normalized.includes('são tomé') || normalized.includes('sao tome') || normalized.includes('santo tomé')) {
      return [
        { url: 'https://news.google.com/rss/search?q=%22Sao+Tome+and+Principe%22&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
      ];
    }
    if (normalized.includes('timor')) {
      return [
        { url: 'https://news.google.com/rss/search?q=%22Timor-Leste%22+OR+%22East+Timor%22&hl=en-US&gl=US&ceid=US:en', source: 'Google News' },
      ];
    }
    return [
      {
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(country.trim())}&hl=en-US&gl=US&ceid=US:en`,
        source: 'Google News',
      },
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
    ];
  }

  if (lang === 'es') {
    const queryTerm =
      normalized === 'brasil' || normalized === 'brazil'
        ? 'Brasil'
        : normalized === 'moçambique' || normalized === 'mozambique'
          ? 'Mozambique'
          : normalized === 'cabo verde' || normalized === 'cape verde'
            ? 'Cabo Verde'
            : country.trim();
    return [
      {
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(queryTerm)}&hl=es-419&gl=US&ceid=US:es-419`,
        source: 'Google News',
      },
      { url: 'https://feeds.bbci.co.uk/mundo/rss.xml', source: 'BBC Mundo' },
      { url: 'https://www.france24.com/es/rss', source: 'France 24 Español' },
    ];
  }

  if (normalized === 'angola') {
    return [
      { url: 'https://news.google.com/rss/search?q=Angola&hl=pt-PT&gl=PT&ceid=PT:pt-PT', source: 'Google News' },
      { url: 'https://www.rfi.fr/pt/angola/rss', source: 'RFI Português' },
      { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', source: 'BBC News Brasil' },
    ];
  }
  if (normalized === 'brasil' || normalized === 'brazil') {
    return [
      { url: 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419', source: 'Google News Brasil' },
      { url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', source: 'Agência Brasil' },
      { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', source: 'BBC News Brasil' },
    ];
  }
  if (normalized === 'portugal') {
    return [
      { url: 'https://news.google.com/rss?hl=pt-PT&gl=PT&ceid=PT:pt-PT', source: 'Google News Portugal' },
      { url: 'https://www.rtp.pt/noticias/rss', source: 'RTP Notícias' },
      { url: 'https://feeds.feedburner.com/PublicoRSS', source: 'Público' },
    ];
  }
  if (normalized === 'moçambique' || normalized === 'mocambique' || normalized === 'mozambique') {
    return [
      { url: 'https://news.google.com/rss/search?q=Mo%C3%A7ambique&hl=pt-PT&gl=PT&ceid=PT:pt-PT', source: 'Google News' },
      { url: 'https://www.rfi.fr/pt/mo%C3%A7ambique/rss', source: 'RFI Português' },
    ];
  }
  if (normalized === 'cabo verde' || normalized === 'cape verde') {
    return [
      { url: 'https://news.google.com/rss/search?q=%22Cabo+Verde%22&hl=pt-PT&gl=PT&ceid=PT:pt-PT', source: 'Google News' },
    ];
  }
  if (normalized.includes('guiné') || normalized.includes('guine') || normalized.includes('guinea')) {
    return [
      { url: 'https://news.google.com/rss/search?q=%22Guin%C3%A9-Bissau%22&hl=pt-PT&gl=PT&ceid=PT:pt-PT', source: 'Google News' },
    ];
  }
  if (normalized.includes('são tomé') || normalized.includes('sao tome')) {
    return [
      { url: 'https://news.google.com/rss/search?q=%22S%C3%A3o+Tom%C3%A9+e+Pr%C3%ADncipe%22&hl=pt-PT&gl=PT&ceid=PT:pt-PT', source: 'Google News' },
    ];
  }
  if (normalized.includes('timor')) {
    return [
      { url: 'https://news.google.com/rss/search?q=%22Timor-Leste%22&hl=pt-PT&gl=PT&ceid=PT:pt-PT', source: 'Google News' },
    ];
  }

  return [
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(country.trim())}&hl=pt-PT&gl=PT&ceid=PT:pt-PT`,
      source: 'Google News',
    },
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(country.trim())}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
      source: 'Google News',
    },
  ];
}

const STOPWORDS = new Set([
  'para', 'como', 'mais', 'sobre', 'pelo', 'pela', 'pelos', 'pelas', 'entre', 'apos', 'após',
  'esta', 'este', 'isto', 'esse', 'essa', 'isso', 'aquele', 'aquela', 'uma', 'uns', 'umas',
  'com', 'sem', 'dos', 'das', 'que', 'nao', 'não', 'sim', 'por', 'sua', 'seu', 'seus', 'suas',
  'foi', 'sao', 'são', 'era', 'tem', 'ter', 'vai', 'ser', 'hoje', 'ontem', 'agora', 'amanha', 'amanhã',
  'diz', 'dizem', 'segundo', 'contra', 'novo', 'nova', 'novos', 'novas', 'anos', 'meses', 'dias',
  'todas', 'todos', 'tudo', 'nada', 'muito', 'muita', 'ouvi', 'dizer', 'verdade', 'fofoca', 'boato',
  'urgente', 'partilhe', 'compartilhe', 'recebi', 'whatsapp', 'sera', 'será', 'falam',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'news', 'today', 'yesterday', 'tomorrow',
  'they', 'their', 'there', 'about', 'said', 'says', 'heard', 'rumor', 'gossip', 'true', 'breaking',
  'share', 'urgent', 'people', 'every', 'will', 'would', 'could', 'have', 'been', 'were', 'all',
  'para', 'como', 'sobre', 'pero', 'porque', 'cuando', 'donde', 'quien', 'dicen', 'rumor', 'chisme',
  'verdad', 'ayer', 'mañana', 'manana', 'ahora', 'todo', 'todos', 'todas', 'comparte',
]);

const RUMOR_FRAMING_REGEX = /\b(dizem que|ouvi dizer|é verdade que|e verdade que|será que|sera que|fofoca|boato|they say|i heard|rumor has it|is it true|gossip|dicen que|escuche que|es verdad|chisme|bulo)\b/i;

const DEBUNK_PATTERNS = [
  'e falso', 'é falso', 'e falsa', 'é falsa', 'fake news', 'boato', 'boatos',
  'desmente', 'desmentido', 'desmentida', 'nao e verdade', 'não é verdade',
  'enganoso', 'enganosa', 'mentira', 'golpe', 'fraude', 'manipulado', 'montagem',
  'checamos', 'fato ou fake', 'falso que', 'nao procede', 'não procede',
  'fact check', 'fact-check', 'false claim', 'debunked', 'hoax', 'misleading',
  'not true', 'scam alert', 'bulo', 'es falso', 'es falsa', 'desmiente', 'engañosa',
];

const FACT_CHECK_PUBLISHERS = [
  'poligrafo', 'polígrafo', 'aos fatos', 'agencia lupa', 'agência lupa',
  'boatos.org', 'e-farsas', 'afp checamos', 'snopes', 'politifact',
  'factcheck.org', 'full fact', 'maldita.es', 'newtral', 'chequeado', 'verificado',
  'reuters fact check', 'ap fact check', 'bbc verify',
];

const ESTABLISHED_PRESS_HINTS = [
  'reuters', 'ap news', 'associated press', 'bbc', 'cnn', 'bloomberg', 'financial times',
  'the guardian', 'new york times', 'washington post', 'al jazeera', 'france 24', 'dw',
  'rtp', 'publico', 'público', 'observador', 'expresso', 'sic noticias', 'sic notícias',
  'agencia brasil', 'agência brasil', 'g1', 'folha', 'estadao', 'estadão', 'uol', 'o globo',
  'rfi', 'jornal de angola', 'angop', 'efe', 'el pais', 'el país', 'clarin', 'clarín',
];

const UNMODERATED_BLOG_DOMAINS = [
  'blogspot.com', 'wordpress.com', 'medium.com', 'reddit.com', 'quora.com',
  'tumblr.com', 'substack.com', 'tiktok.com', 'instagram.com', 'facebook.com',
  'threads.net', 'x.com', 'twitter.com',
];

const UNMODERATED_SOURCE_NAMES = [
  'facebook', 'reddit', 'tiktok', 'instagram', 'quora', 'blogspot', 'wordpress',
];

function classifyTrustTier(sourceName: string, url: string): SourceTrustTier {
  const normSource = sourceName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = '';
  }
  const normalizedHost = hostname.toLowerCase().replace(/^www\./i, '');

  if (
    FACT_CHECK_PUBLISHERS.some((publisher) => {
      const normalizedPublisher = publisher
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const hostLabel = normalizedHost.split('.')[0];
      return (
        normSource.includes(normalizedPublisher) ||
        hostLabel === normalizedPublisher ||
        (normalizedPublisher.includes('.') &&
          (normalizedHost === normalizedPublisher ||
            normalizedHost.endsWith(`.${normalizedPublisher}`)))
      );
    })
  ) {
    return 'fact_checker';
  }

  const officialDomainInSourceName =
    /(?:^|[^a-z0-9])(?:[\w-]+\.)*(?:gov|edu)(?:\.[a-z]{2})?[\s).]*$/i.test(
      sourceName.trim()
    );
  if (isOfficialInstitutionalHost(hostname) || officialDomainInSourceName) {
    return 'official_institutional';
  }

  if (
    ESTABLISHED_PRESS_HINTS.some((p) =>
      normSource.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    )
  ) {
    return 'established_press';
  }

  return 'web_source';
}

function getSourceDedupeKey(
  item: Pick<MatchedSourceItem, 'link' | 'source' | 'title'>
): string {
  try {
    const url = new URL(item.link);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return `${item.source.toLowerCase().trim()}::${item.title.toLowerCase().trim()}`;
  }
}

function isLowCredibilityBlogOrForum(url: string, sourceName = ''): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerSource = sourceName.toLowerCase().trim();
  if (UNMODERATED_BLOG_DOMAINS.some((d) => lowerUrl.includes(d))) return true;
  if (lowerSource && UNMODERATED_SOURCE_NAMES.some((s) => lowerSource === s || lowerSource.startsWith(`${s} `))) {
    return true;
  }
  return false;
}

function stripRumorIntros(input: string): string {
  return input
    .replace(
      /^(dizem que|ouvi dizer que|é verdade que|e verdade que|será que|sera que|fofoca:|boato:|urgente:?|atenção:?|atencao:?|repassa:?|they say|i heard that|is it true that|rumor has it|rumor:|gossip:|breaking:?|dicen que|escuche que|es verdad que|chisme:|bulo:)\s+/gi,
      ''
    )
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function computeOverlapStats(queryTokens: string[], candidateTitle: string): { hits: number; ratio: number } {
  if (queryTokens.length === 0) return { hits: 0, ratio: 0 };
  const candidateTokens = new Set(tokenize(candidateTitle));
  let hits = 0;
  for (const t of queryTokens) {
    if (candidateTokens.has(t)) hits++;
  }
  const denom = Math.min(queryTokens.length, 6);
  return { hits, ratio: hits / denom };
}

function looksLikeDebunkHeadline(title: string, source: string): boolean {
  const normTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const normSource = source
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (DEBUNK_PATTERNS.some((p) => normTitle.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
    return true;
  }
  return FACT_CHECK_PUBLISHERS.some((pub) =>
    normSource.includes(pub.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  );
}

function extractUrlFromText(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  try {
    const parsed = new URL(match[0]);
    return parsed.toString();
  } catch {
    return null;
  }
}

function isIgnoredWrapperTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  return (
    !t ||
    t === 'google news' ||
    t === 'google' ||
    t.includes('just a moment') ||
    t.includes('access denied') ||
    t.includes('attention required')
  );
}

function extractTitleFromUrlSlug(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.includes('news.google.com')) return '';
    const segments = parsed.pathname
      .split('/')
      .map((s) => s.trim())
      .filter((s) => s && s.length > 4 && !/^\d+$/.test(s) && !/^(news|article|story|world|africa|europe|politica|economia|mundo|html|amp)$/i.test(s));
    const best = segments.sort((a, b) => b.length - a.length)[0];
    if (!best) return '';
    return decodeURIComponent(best)
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\d{4,}\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

// Strict zero-cost daily free-tier API quota guard (caps at 95 calls/day per provider inside 100/day free tiers)
const FREE_API_DAILY_CAP = 95;
const FREE_API_USAGE: Record<string, { date: string; count: number }> = {};

function canConsumeFreeApiQuota(provider: 'google_cse' | 'gnews'): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const current = FREE_API_USAGE[provider];
  if (!current || current.date !== today) {
    FREE_API_USAGE[provider] = { date: today, count: 1 };
    return true;
  }
  if (current.count >= FREE_API_DAILY_CAP) {
    return false;
  }
  current.count += 1;
  return true;
}

// Server-side 20-minute cache for /api/news RSS feeds
const NEWS_SERVER_CACHE_TTL_MS = 20 * 60 * 1000;
const NEWS_SERVER_CACHE = new Map<string, { cachedAt: number; items: RssArticle[] }>();

// Optional Stage 2 Connector: Tavily AI Web Search (clean content for AI)
async function searchTavilyIfConfigured(query: string): Promise<MatchedSourceItem[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !query.trim()) return [];
  try {
    const res = await fetchWithTimeout('https://api.tavily.com/search', 7000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.slice(0, 200),
        search_depth: 'basic',
        max_results: 5,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }>;
    };
    const items: MatchedSourceItem[] = [];
    for (const r of data.results || []) {
      if (!r.url || isLowCredibilityBlogOrForum(r.url)) continue;
      let domain = 'Web source';
      try {
        domain = new URL(r.url).hostname.replace(/^www\./i, '');
      } catch {
        domain = 'Web source';
      }
      items.push({
        title: r.title || domain,
        source: domain,
        publishedAt: r.published_date || '',
        link: r.url,
        snippet: (r.content || '').slice(0, 500),
        isFactCheck: looksLikeDebunkHeadline(r.title || '', domain),
        trustTier: classifyTrustTier(domain, r.url),
      });
    }
    return items;
  } catch {
    return [];
  }
}

// Optional Stage 2 Connector: Serper Google Search API
async function searchSerperIfConfigured(query: string, lang: ServerLang): Promise<MatchedSourceItem[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || !query.trim()) return [];
  try {
    const res = await fetchWithTimeout('https://google.serper.dev/search', 7000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: query.slice(0, 200),
        hl: lang,
        num: 5,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>;
    };
    const items: MatchedSourceItem[] = [];
    for (const r of data.organic || []) {
      if (!r.link || isLowCredibilityBlogOrForum(r.link)) continue;
      let domain = 'Web source';
      try {
        domain = new URL(r.link).hostname.replace(/^www\./i, '');
      } catch {
        domain = 'Web source';
      }
      items.push({
        title: r.title || domain,
        source: domain,
        publishedAt: r.date || '',
        link: r.link,
        snippet: (r.snippet || '').slice(0, 400),
        isFactCheck: looksLikeDebunkHeadline(r.title || '', domain),
        trustTier: classifyTrustTier(domain, r.link),
      });
    }
    return items;
  } catch {
    return [];
  }
}

// Optional Stage 2 Connector: Google Custom Search JSON API (free tier: 100 queries/day, server-side key only)
async function searchGoogleCustomSearchIfConfigured(
  query: string,
  lang: ServerLang
): Promise<MatchedSourceItem[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  if (!apiKey || !cx || !query.trim() || !canConsumeFreeApiQuota('google_cse')) return [];
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
      apiKey
    )}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query.slice(0, 180))}&lr=lang_${lang}&num=5`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: Array<{ title?: string; link?: string; displayLink?: string; snippet?: string }>;
    };
    const items: MatchedSourceItem[] = [];
    for (const r of data.items || []) {
      if (!r.link || isLowCredibilityBlogOrForum(r.link)) continue;
      const domain = (r.displayLink || 'Web source').replace(/^www\./i, '');
      items.push({
        title: r.title || domain,
        source: domain,
        publishedAt: '',
        link: r.link,
        snippet: (r.snippet || '').slice(0, 400),
        isFactCheck: looksLikeDebunkHeadline(r.title || '', domain),
        trustTier: classifyTrustTier(domain, r.link),
      });
    }
    return items;
  } catch {
    return [];
  }
}

// Optional Stage 2 Connector: GNews API (free tier: 100 requests/day, server-side key only)
async function searchGNewsIfConfigured(query: string, lang: ServerLang): Promise<MatchedSourceItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey || !query.trim() || !canConsumeFreeApiQuota('gnews')) return [];
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
      query.slice(0, 140)
    )}&lang=${lang}&max=5&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      articles?: Array<{
        title?: string;
        description?: string;
        url?: string;
        publishedAt?: string;
        source?: { name?: string };
      }>;
    };
    const items: MatchedSourceItem[] = [];
    for (const a of data.articles || []) {
      if (!a.url || !a.title || isLowCredibilityBlogOrForum(a.url, a.source?.name || '')) continue;
      const sourceName = a.source?.name || 'News';
      items.push({
        title: a.title,
        source: sourceName,
        publishedAt: a.publishedAt || '',
        link: a.url,
        snippet: (a.description || '').slice(0, 400),
        isFactCheck: looksLikeDebunkHeadline(a.title, sourceName),
        trustTier: classifyTrustTier(sourceName, a.url),
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchGNewsHeadlinesIfConfigured(country: string, lang: ServerLang): Promise<RssArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey || !canConsumeFreeApiQuota('gnews')) return [];
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
      country
    )}&lang=${lang}&max=8&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      articles?: Array<{
        title?: string;
        url?: string;
        image?: string;
        publishedAt?: string;
        source?: { name?: string; url?: string };
      }>;
    };
    const items: RssArticle[] = [];
    for (const a of data.articles || []) {
      if (!a.title || !a.url) continue;
      const id = crypto.createHash('sha256').update(a.url).digest('hex').slice(0, 16);
      const imageUrl = a.image && /^https?:\/\//i.test(a.image) ? a.image : undefined;
      items.push({
        id,
        title: a.title,
        source: a.source?.name || 'GNews',
        sourceUrl: a.source?.url,
        publishedAt: a.publishedAt || new Date().toISOString(),
        link: a.url,
        ...(imageUrl ? { imageUrl } : {}),
      });
    }
    return items;
  } catch {
    return [];
  }
}

// Optional Stage 2 Connector: Google Fact Check Tools API
async function searchGoogleFactCheckTools(query: string, lang: ServerLang): Promise<FactCheckEntry[]> {
  const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;
  if (!apiKey || !query.trim()) return [];
  try {
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(
      query.slice(0, 180)
    )}&languageCode=${lang}&pageSize=5&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      claims?: Array<{
        text?: string;
        claimant?: string;
        claimReview?: Array<{
          publisher?: { name?: string; site?: string };
          url?: string;
          textualRating?: string;
          reviewDate?: string;
        }>;
      }>;
    };

    const entries: FactCheckEntry[] = [];
    for (const c of data.claims || []) {
      const review = c.claimReview?.[0];
      if (!review?.url || !review?.textualRating) continue;
      entries.push({
        claimText: c.text || query,
        claimant: c.claimant,
        publisher: review.publisher?.name || review.publisher?.site || 'Fact-Checker',
        rating: review.textualRating,
        url: review.url,
        reviewDate: review.reviewDate,
      });
    }
    return entries;
  } catch {
    return [];
  }
}

async function searchPublicRssForClaim(queryText: string, lang: ServerLang): Promise<{
  newsMatches: RssArticle[];
  factCheckMatches: RssArticle[];
}> {
  const cleaned = stripRumorIntros(queryText.replace(/https?:\/\/\S+/g, '').trim());
  const tokens = tokenize(cleaned);
  const searchTerms = tokens.slice(0, 7).join(' ') || cleaned.slice(0, 80);
  if (!searchTerms || searchTerms.length < 3) {
    return { newsMatches: [], factCheckMatches: [] };
  }

  const factCheckTerms = tokens.slice(0, 4).join(' ');
  const newsUrlsByLang: Record<ServerLang, string[]> = {
    en: [
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=en-US&gl=US&ceid=US:en`,
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=en-GB&gl=GB&ceid=GB:en`,
    ],
    pt: [
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=pt-PT&gl=PT&ceid=PT:pt-PT`,
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
    ],
    es: [
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=es-419&gl=US&ceid=US:es-419`,
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=es&gl=ES&ceid=ES:es`,
    ],
  };

  const factCheckUrlsByLang: Record<ServerLang, string[]> = {
    en: [
      `https://news.google.com/rss/search?q=${encodeURIComponent(`${factCheckTerms} ("fact check" OR false OR hoax OR rumor)`)}&hl=en-US&gl=US&ceid=US:en`,
    ],
    pt: [
      `https://news.google.com/rss/search?q=${encodeURIComponent(`${factCheckTerms} (falso OR boato OR fake OR poligrafo OR lupa)`)}&hl=pt-PT&gl=PT&ceid=PT:pt-PT`,
      `https://news.google.com/rss/search?q=${encodeURIComponent(`${factCheckTerms} (falso OR boato OR fake OR boatos)`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
    ],
    es: [
      `https://news.google.com/rss/search?q=${encodeURIComponent(`${factCheckTerms} (falso OR bulo OR maldita OR newtral)`)}&hl=es-419&gl=US&ceid=US:es-419`,
    ],
  };

  const newsUrls = newsUrlsByLang[lang];
  const factCheckUrls = factCheckTerms ? factCheckUrlsByLang[lang] : [];

  const [newsBatches, fcBatches] = await Promise.all([
    Promise.all(newsUrls.map((u) => fetchRssFeed(u, 'Google News'))),
    Promise.all(factCheckUrls.map((u) => fetchRssFeed(u, 'Fact-checker'))),
  ]);

  const filterByRelevance = (items: RssArticle[], requireDebunk: boolean) => {
    const seenSources = new Map<string, RssArticle>();
    for (const item of items) {
      if (isLowCredibilityBlogOrForum(item.link, item.source)) continue;
      if (requireDebunk && !looksLikeDebunkHeadline(item.title, item.source)) {
        continue;
      }
      const stats = computeOverlapStats(tokens, item.title);
      const minHits = tokens.length >= 4 ? Math.min(3, Math.ceil(tokens.length * 0.5)) : tokens.length >= 2 ? 2 : 1;
      if (tokens.length > 0 && (stats.hits < minHits || stats.ratio < 0.45)) {
        continue;
      }
      const key = item.source.toLowerCase().trim();
      if (!seenSources.has(key)) {
        seenSources.set(key, item);
      }
    }
    return Array.from(seenSources.values());
  };

  return {
    newsMatches: filterByRelevance(newsBatches.flat(), false),
    factCheckMatches: filterByRelevance(fcBatches.flat(), true),
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function extractMediaSearchQueryWithGemini(
  mediaType: string,
  base64Data: string,
  mimeType: string
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) return '';
  try {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text:
              mediaType === 'audio'
                ? 'Transcribe only the key spoken claim or phrase in this audio (max 18 words), without inventing anything. If unclear, respond empty.'
                : 'Extract only visible text (headlines, captions, messages) or describe in up to 12 words the main news event visible in this image/video. Never invent names or dates.',
          },
        ],
      },
    });
    return (response.text || '').trim();
  } catch {
    return '';
  }
}

type GroundedVerdictCategory =
  | 'CONFIRMED_MULTIPLE_SOURCES'
  | 'FALSE'
  | 'OUT_OF_CONTEXT'
  | 'EXAGGERATED'
  | 'NO_EVIDENCE';

interface GroundedCrossCheckResult {
  verdict: GroundedVerdictCategory;
  score: number | null;
  flags: string[];
  citedAnalysis: string;
  claimStatuses: Array<{ claim: string; status: 'supported' | 'refuted' | 'misleading' | 'unverified'; note?: string }>;
  sourceRelations: Array<'direct_support' | 'direct_refutation' | 'related_only' | 'insufficient'>;
  factCheckRelations: Array<'direct' | 'related' | 'unknown'>;
  groundingSources: MatchedSourceItem[];
}

const RED_FLAG_LABELS: Record<
  ServerLang,
  {
    sensationalist: string;
    unattributedRumor: string;
    missingSources: string;
    urgencyBait: string;
    excessiveCaps: string;
  }
> = {
  en: {
    sensationalist: 'Sensationalist or alarmist wording detected',
    unattributedRumor: 'Unattributed hearsay framing ("they say", "rumor")',
    missingSources: 'No corroborating public sources cited',
    urgencyBait: 'Urgency or viral forwarding pressure ("share before deleted")',
    excessiveCaps: 'Excessive uppercase or exclamation formatting',
  },
  pt: {
    sensationalist: 'Linguagem sensacionalista ou alarmista detetada',
    unattributedRumor: 'Estrutura de boato sem fonte ("dizem que", "ouvi dizer")',
    missingSources: 'Sem fontes públicas citadas a confirmar',
    urgencyBait: 'Pressão de urgência ou partilha ("urgente", "repassa")',
    excessiveCaps: 'Uso excessivo de maiúsculas ou pontos de exclamação',
  },
  es: {
    sensationalist: 'Lenguaje sensacionalista o alarmista detectado',
    unattributedRumor: 'Formato de rumor sin fuente ("dicen que", "chisme")',
    missingSources: 'Sin fuentes públicas citadas que lo respalden',
    urgencyBait: 'Presión de urgencia para reenviar ("urgente", "comparte")',
    excessiveCaps: 'Uso excesivo de mayúsculas o signos de exclamación',
  },
};

function detectLinguisticRedFlags(
  rawText: string,
  hasOriginalUrl: boolean,
  sourcesCount: number,
  lang: ServerLang
): string[] {
  const labels = RED_FLAG_LABELS[lang];
  const flags: string[] = [];

  if (RUMOR_FRAMING_REGEX.test(rawText)) {
    flags.push(labels.unattributedRumor);
  }
  if (
    /\b(urgente|urgent|share before|comparte antes|partilhe antes|repassa|breaking|bomba|escandalo|escândalo|shocking|chocante)\b/i.test(
      rawText
    )
  ) {
    flags.push(labels.urgencyBait);
  }
  const letters = rawText.replace(/[^a-zA-Z]/g, '');
  const upperLetters = rawText.replace(/[^A-Z]/g, '');
  if (
    (letters.length >= 20 && upperLetters.length / letters.length >= 0.65) ||
    (rawText.match(/!/g) || []).length >= 2
  ) {
    flags.push(labels.excessiveCaps);
  }
  if (
    /\b(100%|milagre|miracle|garantido|guaranteed|segredo|secret|proibido|forbidden|censurado|censored)\b/i.test(
      rawText
    )
  ) {
    flags.push(labels.sensationalist);
  }
  if (!hasOriginalUrl && sourcesCount === 0) {
    flags.push(labels.missingSources);
  }

  return flags.slice(0, 4);
}

type MediaTypeServer = 'link' | 'text' | 'image' | 'video' | 'document' | 'audio';
type StreamStageServer =
  | 'checking_cache'
  | 'understanding_input'
  | 'extracting_claims'
  | 'reading_document'
  | 'retrieving_sources'
  | 'reranking_sources'
  | 'analyzing_content'
  | 'validating_guardrails'
  | 'streaming_response';

type VerificationIntentServer =
  | 'factual_claim'
  | 'document_audit'
  | 'technical_question'
  | 'vague_followup';

type DateFilterWindowServer = 'any' | '7d' | '30d' | '1y';
type SourceCategoryFilterServer = 'all' | 'fact_check' | 'press' | 'official_science';

interface CustomMemoryInput {
  tone?: 'objective' | 'detailed' | 'simple';
  focusArea?: string;
  instructions?: string;
}

interface MetadataSearchFiltersServer {
  dateWindow?: DateFilterWindowServer;
  category?: SourceCategoryFilterServer;
}

interface VerifyRequestBody {
  type?: MediaTypeServer;
  content?: string;
  lang?: ServerLang;
  titleHint?: string;
  sourceHint?: string;
  publishedAtHint?: string;
  fileName?: string;
  fileDataBase64?: string;
  mimeType?: string;
  ragContext?: string;
  memory?: CustomMemoryInput;
  conversationHistory?: string[];
  metadataFilters?: MetadataSearchFiltersServer;
}

interface ExtractedClaimResultServer {
  claim: string;
  status: 'supported' | 'refuted' | 'misleading' | 'unverified';
  note?: string;
}

interface PipelineAuditSummaryServer {
  intent: VerificationIntentServer;
  normalizedQuery: string;
  rewrittenQuery?: string;
  claimsExtractedCount: number;
  retrievedCandidatesCount: number;
  keptAfterRerankCount: number;
  discardedLowRelevanceCount: number;
  hybridVectorUsed: boolean;
  guardrailStatus: 'passed' | 'adjusted_ungrounded' | 'insufficient_evidence';
  dateWarning?: string | null;
}

interface VerifyResponsePayload {
  ok: true;
  type: MediaTypeServer;
  seal: SealStatus;
  sealLabel: string;
  certaintyLabel: string;
  reliabilityScore: number;
  redFlags: string[];
  source: string;
  publishedAt: string;
  originalLink: string | null;
  sourcesCount: number;
  matchedSources: MatchedSourceItem[];
  factChecks: FactCheckEntry[];
  citedAnalysis: string;
  extractedClaims: ExtractedClaimResultServer[];
  dateWarning: string | null;
  pipelineAudit: PipelineAuditSummaryServer;
  queryUsed: string;
  note: string;
  checkedAt: string;
  modelUsed: string;
  cached: boolean;
  ragChunksUsed: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const MIN_RELEVANCE_THRESHOLD = 0.26;
const VERIFY_CACHE = new Map<string, { expiresAt: number; payload: VerifyResponsePayload }>();

function buildVerifyCacheKey(body: VerifyRequestBody, lang: ServerLang): string | null {
  const fileSig = body.fileDataBase64
    ? crypto.createHash('sha256').update(body.fileDataBase64.slice(0, 65536)).digest('hex').slice(0, 16)
    : '';
  const raw = JSON.stringify({
    type: body.type || 'link',
    content: (body.content || '').trim().toLowerCase(),
    lang,
    rag: (body.ragContext || '').trim().toLowerCase(),
    fileName: body.fileName || '',
    fileSig,
    tone: body.memory?.tone || 'objective',
    focus: (body.memory?.focusArea || '').trim().toLowerCase(),
    inst: (body.memory?.instructions || '').trim().toLowerCase(),
    titleHint: (body.titleHint || '').trim().toLowerCase(),
    sourceHint: (body.sourceHint || '').trim().toLowerCase(),
    publishedAtHint: (body.publishedAtHint || '').trim().toLowerCase(),
    dateWindow: body.metadataFilters?.dateWindow || 'any',
    category: body.metadataFilters?.category || 'all',
    historySig: (body.conversationHistory || []).slice(0, 3).join('|').toLowerCase(),
  });
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function getCachedVerification(key: string): VerifyResponsePayload | null {
  const entry = VERIFY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    VERIFY_CACHE.delete(key);
    return null;
  }
  VERIFY_CACHE.delete(key);
  VERIFY_CACHE.set(key, entry);
  return {
    ...entry.payload,
    cached: true,
    checkedAt: new Date().toISOString(),
  };
}

function setCachedVerification(key: string, payload: VerifyResponsePayload): void {
  if (VERIFY_CACHE.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = VERIFY_CACHE.keys().next().value;
    if (oldestKey) VERIFY_CACHE.delete(oldestKey);
  }
  VERIFY_CACHE.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload: { ...payload, cached: false },
  });
}

// =========================================================================
// STAGE 1: Input Comprehension, Normalization, Query Rewriting & Claim Extraction
// =========================================================================
function normalizeInputText(input: string): string {
  const cleaned = input
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ')
    .replace(/!{2,}/g, '!')
    .replace(/\?{2,}/g, '?')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^https?:\/\/\S+$/i.test(cleaned)) {
    return cleaned;
  }

  return cleaned
    .replace(/\bmsg\b/gi, 'message')
    .replace(/\bgov\b/gi, 'government')
    .replace(/\binfo\b/gi, 'information')
    .replace(/\bvac\b/gi, 'vaccine')
    .replace(/\bdoc\b/gi, 'document')
    .replace(/\bq\b/gi, 'que')
    .replace(/\bvc\b/gi, 'você')
    .replace(/\bpq\b/gi, 'porque')
    .replace(/\btbm\b/gi, 'também');
}

function isVagueFollowUpQuery(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (/^https?:\/\//i.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 5) {
    return /\b(this|that|it|isso|isto|aquilo|como faço|how do i|is it true|é verdade|es verdad|explain|explica|porquê|why)\b/i.test(
      trimmed
    );
  }
  return false;
}

function deterministicExtractClaims(text: string): string[] {
  const stripped = stripRumorIntros(text.replace(/https?:\/\/\S+/g, ' ').trim());
  const parts = stripped
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 16);
  if (parts.length === 0 && stripped.length >= 4) {
    return [stripped.slice(0, 260)];
  }
  return parts.slice(0, 3);
}

interface InputUnderstandingResult {
  normalizedQuery: string;
  rewrittenQuery?: string;
  intent: VerificationIntentServer;
  extractedClaims: string[];
  searchQueriesByClaim?: Array<Partial<Record<ServerLang, string>>>;
}

async function understandInputAndExtractClaims(
  rawText: string,
  mediaType: MediaTypeServer,
  conversationHistory: string[] | undefined,
  lang: ServerLang
): Promise<InputUnderstandingResult> {
  const normalizedQuery = normalizeInputText(rawText);
  const vague = isVagueFollowUpQuery(normalizedQuery);
  const historySnippets = (conversationHistory || []).filter((h) => h && h.trim().length > 3).slice(0, 3);

  let fallbackIntent: VerificationIntentServer = 'factual_claim';
  if (mediaType === 'document') {
    fallbackIntent = 'document_audit';
  } else if (vague) {
    fallbackIntent = 'vague_followup';
  } else if (/^(how|why|what is|como|porque|o que é|qué es|cómo)\b/i.test(normalizedQuery)) {
    fallbackIntent = 'technical_question';
  }

  let fallbackRewritten: string | undefined;
  if (vague && historySnippets.length > 0) {
    fallbackRewritten = `${historySnippets[0]} — ${normalizedQuery}`;
  }

  const fallbackClaims = deterministicExtractClaims(fallbackRewritten || normalizedQuery);
  const ai = getGeminiClient();
  if (!ai || !normalizedQuery || /^https?:\/\/\S+$/i.test(normalizedQuery)) {
    return {
      normalizedQuery,
      rewrittenQuery: fallbackRewritten,
      intent: fallbackIntent,
      extractedClaims: fallbackClaims,
    };
  }

  try {
    const responseLanguageName = lang === 'pt' ? 'Portuguese' : lang === 'es' ? 'Spanish' : 'English';
    const historyBlock =
      historySnippets.length > 0
        ? `Recent user session context:\n${historySnippets.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\n`
        : '';

    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `${historyBlock}Analyze this user input (type=${mediaType}):
"${normalizedQuery.slice(0, 1200)}"

Tasks:
1. Clean typos/abbreviations and normalize into a clear search query (${responseLanguageName}).
2. Classify intent strictly as one of: factual_claim, document_audit, technical_question, vague_followup.
3. If the input is a vague follow-up (e.g. "how do I do that?", "is that true?") and session context exists, rewrite it into a complete self-contained query; otherwise leave rewrittenQuery empty.
4. Separate verifiable factual claims from opinions/insults/adjectives. If multiple distinct rumors or claims exist, decompose into up to 3 independent verifiable sub-claims (each concise, factual, in ${responseLanguageName}).
5. For each claim, provide equivalent concise search queries in English, Portuguese, and Spanish. Preserve the exact meaning and named entities; do not add assumptions. Return one searchQueriesByClaim item per claim in the same order.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cleanedQuery: { type: Type.STRING },
            intent: { type: Type.STRING },
            rewrittenQuery: { type: Type.STRING },
            claims: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            searchQueriesByClaim: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  pt: { type: Type.STRING },
                  es: { type: Type.STRING },
                },
                required: ['en', 'pt', 'es'],
              },
            },
          },
          required: ['cleanedQuery', 'intent', 'claims', 'searchQueriesByClaim'],
        },
      },
    });

    const parsed = JSON.parse((res.text || '{}').trim()) as {
      cleanedQuery?: string;
      intent?: string;
      rewrittenQuery?: string;
      claims?: string[];
      searchQueriesByClaim?: Array<Partial<Record<ServerLang, string>>>;
    };

    const intent: VerificationIntentServer =
      parsed.intent === 'document_audit' ||
      parsed.intent === 'technical_question' ||
      parsed.intent === 'vague_followup'
        ? parsed.intent
        : 'factual_claim';

    const cleanedClaims = (parsed.claims || [])
      .map((c) => c.trim())
      .filter((c) => c.length >= 6)
      .slice(0, 3);
    const extractedClaims = cleanedClaims.length > 0 ? cleanedClaims : fallbackClaims;
    const searchQueriesByClaim = extractedClaims.map((claim, index) => {
      const queries = parsed.searchQueriesByClaim?.[index] || {};
      return {
        en: queries.en?.trim() || claim,
        pt: queries.pt?.trim() || claim,
        es: queries.es?.trim() || claim,
      };
    });

    return {
      normalizedQuery: parsed.cleanedQuery?.trim() || normalizedQuery,
      rewrittenQuery: parsed.rewrittenQuery?.trim() || fallbackRewritten,
      intent,
      extractedClaims,
      searchQueriesByClaim:
        searchQueriesByClaim.length > 0 ? searchQueriesByClaim : undefined,
    };
  } catch {
    return {
      normalizedQuery,
      rewrittenQuery: fallbackRewritten,
      intent: fallbackIntent,
      extractedClaims: fallbackClaims,
    };
  }
}

// =========================================================================
// STAGE 2 & 3: Hybrid Embeddings (gemini-embedding-2 + Lexical), Metadata Filters & Top-20 Reranking
// =========================================================================
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

async function computeBatchEmbeddings(texts: string[]): Promise<number[][] | null> {
  const ai = getGeminiClient();
  if (!ai || texts.length === 0) return null;
  try {
    const cleanTexts = texts.map((t) => t.slice(0, 1000).trim() || 'empty');
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: cleanTexts,
    });
    const embeddings = result.embeddings;
    if (!embeddings || embeddings.length !== cleanTexts.length) return null;
    const vectors = embeddings.map((e) => e.values || []);
    if (vectors.some((v) => v.length === 0)) return null;
    return vectors;
  } catch {
    return null;
  }
}

function splitIntoRagChunks(text: string, chunkSize = 360): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      chunks.push(para);
    } else {
      for (let idx = 0; idx < para.length; idx += chunkSize - 40) {
        const slice = para.slice(idx, idx + chunkSize).trim();
        if (slice) chunks.push(slice);
      }
    }
  }
  return chunks;
}

async function retrieveHybridRagChunks(
  query: string,
  ragContext: string,
  docText: string,
  maxChunks = 3
): Promise<{ chunks: string[]; vectorUsed: boolean }> {
  const combined = [docText, ragContext].filter((s) => s && s.trim().length > 0).join('\n\n');
  if (!combined) return { chunks: [], vectorUsed: false };
  const chunks = splitIntoRagChunks(combined, 380);
  if (chunks.length <= maxChunks) {
    return { chunks, vectorUsed: false };
  }

  const candidates = chunks.slice(0, 18);
  const qTokens = new Set(tokenize(query));
  const vectors = await computeBatchEmbeddings([query, ...candidates]);
  const vectorUsed = Boolean(vectors);

  const scored = candidates.map((chunk, idx) => {
    const cTokens = tokenize(chunk);
    let lexicalHits = 0;
    for (const tok of cTokens) {
      if (qTokens.has(tok)) lexicalHits += 1;
    }
    const lexicalScore = qTokens.size > 0 ? Math.min(1, lexicalHits / Math.min(qTokens.size, 5)) : 0;
    const semanticScore = vectors ? Math.max(0, cosineSimilarity(vectors[0], vectors[idx + 1])) : 0;
    const combinedScore = vectors
      ? semanticScore * 0.65 + lexicalScore * 0.35 + (idx === 0 ? 0.05 : 0)
      : lexicalScore + (idx === 0 ? 0.08 : 0);

    return { chunk, idx, score: combinedScore };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return {
    chunks: scored.slice(0, maxChunks).map((s) => s.chunk),
    vectorUsed,
  };
}

function matchesMetadataFilters(
  item: MatchedSourceItem,
  filters?: MetadataSearchFiltersServer
): boolean {
  if (!filters) return true;

  if (filters.category && filters.category !== 'all') {
    const tier = item.trustTier || classifyTrustTier(item.source, item.link);
    if (filters.category === 'fact_check' && tier !== 'fact_checker' && !item.isFactCheck) {
      return false;
    }
    if (filters.category === 'official_science' && tier !== 'official_institutional') {
      return false;
    }
    if (
      filters.category === 'press' &&
      tier !== 'established_press' &&
      tier !== 'fact_checker'
    ) {
      return false;
    }
  }

  if (filters.dateWindow && filters.dateWindow !== 'any' && item.publishedAt) {
    const ts = new Date(item.publishedAt).getTime();
    if (Number.isFinite(ts)) {
      const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
      if (filters.dateWindow === '7d' && ageDays > 7) return false;
      if (filters.dateWindow === '30d' && ageDays > 30) return false;
      if (filters.dateWindow === '1y' && ageDays > 365) return false;
    }
  }

  return true;
}

async function rerankAndFilterCandidates(
  queries: string[],
  candidates: MatchedSourceItem[]
): Promise<{
  kept: MatchedSourceItem[];
  discardedCount: number;
  vectorUsed: boolean;
}> {
  if (candidates.length === 0) {
    return { kept: [], discardedCount: 0, vectorUsed: false };
  }

  const top20 = candidates.slice(0, 20);
  const searchQueries = Array.from(new Set(queries.map((query) => query.trim()).filter(Boolean)));
  const queryTokenSets = searchQueries.map((query) => tokenize(query));
  const candidateTexts = top20.map(
    (c) => `${c.source}: ${c.title}${c.snippet ? ` — ${c.snippet.slice(0, 200)}` : ''}`
  );
  const vectors = await computeBatchEmbeddings([...searchQueries, ...candidateTexts]);
  const vectorUsed = Boolean(vectors);

  const scored = top20.map((item, idx) => {
    const candidateText = `${item.title} ${item.snippet || ''}`;
    const statsByQuery = queryTokenSets.map((tokens) => computeOverlapStats(tokens, candidateText));
    const bestStats = statsByQuery.reduce(
      (best, stats) => (stats.ratio > best.ratio ? stats : best),
      { hits: 0, ratio: 0 }
    );
    const lexicalScore = Math.min(1, bestStats.ratio);
    const semanticScore = vectors
      ? Math.max(
          0,
          ...searchQueries.map((_, queryIndex) =>
            cosineSimilarity(vectors[queryIndex], vectors[searchQueries.length + idx])
          )
        )
      : 0;

    const rawScore = vectors
      ? semanticScore * 0.62 + lexicalScore * 0.38
      : lexicalScore;

    const clamped = Math.min(0.99, Math.max(0, Number(rawScore.toFixed(2))));
    return {
      ...item,
      relevanceScore: clamped,
      claimOverlapScore: bestStats.ratio,
    };
  });

  scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  const kept = scored.filter((item) => (item.relevanceScore || 0) >= MIN_RELEVANCE_THRESHOLD);
  const discardedCount = Math.max(0, scored.length - kept.length);

  return {
    kept: kept.slice(0, 8),
    discardedCount,
    vectorUsed,
  };
}

async function extractDocumentText(
  fileDataBase64?: string,
  mimeType?: string,
  fileName?: string
): Promise<string> {
  if (!fileDataBase64) return '';
  const cleanBase64 = fileDataBase64.includes(',') ? fileDataBase64.split(',')[1] : fileDataBase64;
  if (!cleanBase64) return '';

  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  const isPlainOrSheet =
    lowerMime.includes('csv') ||
    lowerMime.includes('tab-separated') ||
    lowerMime.includes('text/') ||
    lowerMime.includes('json') ||
    /\.(csv|tsv|txt|md|json)$/i.test(lowerName);

  if (isPlainOrSheet) {
    try {
      const decoded = Buffer.from(cleanBase64, 'base64').toString('utf8');
      return decoded.replace(/\0/g, '').trim().slice(0, 8000);
    } catch {
      return '';
    }
  }

  const isPdf = lowerMime.includes('pdf') || lowerName.endsWith('.pdf');
  if (isPdf) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const res = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: cleanBase64,
                },
              },
              {
                text: 'Extract the main factual text, key numbers, dates, and claims from this PDF accurately in plain text (max 3500 characters). Never invent text not present in the PDF.',
              },
            ],
          },
        });
        const extracted = (res.text || '').trim();
        if (extracted) return extracted.slice(0, 4000);
      } catch {
        // Fallback to printable text scan below
      }
    }

    try {
      const raw = Buffer.from(cleanBase64, 'base64').toString('latin1');
      const printableRuns = raw.match(/[A-Za-z0-9À-ÿ ,.;:!?%()\/-]{16,}/g) || [];
      return printableRuns
        .filter((line) => !/^(obj|endobj|stream|endstream|xref|trailer)/i.test(line.trim()))
        .slice(0, 40)
        .join('\n')
        .slice(0, 4000);
    } catch {
      return '';
    }
  }

  return '';
}

function selectRoutedModel(
  mediaType: MediaTypeServer,
  queryLength: number,
  hasDocument: boolean,
  ragCount: number,
  sourcesCount: number,
  claimsCount: number
): 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen' {
  const isSimple =
    (mediaType === 'link' || mediaType === 'text') &&
    !hasDocument &&
    ragCount === 0 &&
    claimsCount <= 1 &&
    queryLength <= 150 &&
    sourcesCount <= 2;
  return isSimple ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
}

// =========================================================================
// STAGE 4: Synthesis & Reasoning ("The Judge" with Strict CoT & 5-Verdict Output)
// =========================================================================
async function analyzeAndCrossCheckWithAI(
  claimText: string,
  extractedClaims: string[],
  retrievedSources: MatchedSourceItem[],
  factChecks: FactCheckEntry[],
  pageExcerpt: string,
  ragChunks: string[],
  memory: CustomMemoryInput | undefined,
  routedModel: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen',
  lang: ServerLang,
  onAnalysisChunk?: (delta: string) => void
): Promise<GroundedCrossCheckResult | null> {
  const ai = getGeminiClient();
  if (!ai || !claimText.trim()) return null;

  const numberedSources = retrievedSources
    .slice(0, 8)
    .map(
      (s, i) =>
        `[${i + 1}] ${s.source} (${s.trustTier || 'web_source'}, rel=${s.relevanceScore ?? 0.5}${
          s.publishedAt ? `, date=${s.publishedAt.slice(0, 10)}` : ''
        }): "${s.title}"${s.snippet ? ` — Excerpt: ${s.snippet.slice(0, 180)}` : ''} | URL: ${s.link}`
    )
    .join('\n');

  const factCheckLines = factChecks
    .slice(0, 4)
    .map((fc, i) => `FC-${i + 1}: [${fc.publisher}] Rating="${fc.rating}" | Claim="${fc.claimText}" | URL: ${fc.url}`)
    .join('\n');

  const ragSection =
    ragChunks.length > 0
      ? `User-Provided Reference Context / Document Excerpts (RAG):\n${ragChunks
          .map((c, idx) => `[REF-${idx + 1}] ${c}`)
          .join('\n')}\n\n`
      : '';

  const subClaimsBlock =
    extractedClaims.length > 1
      ? `Extracted Factual Sub-Claims to evaluate individually:\n${extractedClaims
          .map((c, i) => `C${i + 1}: ${c}`)
          .join('\n')}\n\n`
      : '';

  const responseLanguageName =
    lang === 'pt' ? 'Portuguese' : lang === 'es' ? 'Spanish' : 'English';

  const toneDirective =
    memory?.tone === 'detailed'
      ? 'Use a detailed, structured analytical tone (markdown bullet points or compact tables when comparing claims/dates/figures).'
      : memory?.tone === 'simple'
        ? 'Use very simple, clear everyday language accessible to non-technical readers.'
        : 'Use a concise, objective, corporate journalistic tone.';

  const memoryDirectives = [
    toneDirective,
    memory?.focusArea?.trim() ? `User domain focus: ${memory.focusArea.trim().slice(0, 120)}.` : '',
    memory?.instructions?.trim()
      ? `Additional user formatting preference: ${memory.instructions.trim().slice(0, 220)}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const prompt = `You are Ektheto, a strict investigative fact-checking Judge.
Analyze the user's normalized claim/question:
"${claimText.slice(0, 600)}"

${subClaimsBlock}${pageExcerpt ? `Clean text extracted from submitted URL:\n${pageExcerpt.slice(0, 450)}\n\n` : ''}${ragSection}${
    factCheckLines ? `Certified Fact-Check Agency Records:\n${factCheckLines}\n\n` : ''
  }${numberedSources ? `Reranked High-Credibility Sources:\n${numberedSources}\n\n` : ''}
CRITICAL SYSTEM INSTRUCTIONS:
1. GROUNDING ONLY: Answer strictly from the retrieved documents, fact-check records, and RAG excerpts above (plus verified Google Search grounding). NEVER invent dates, numbers, facts, or URLs. If evidence is insufficient, say so explicitly and choose NO_EVIDENCE.
2. EVIDENCE RELATION: For every numbered source, classify whether its title/excerpt directly supports the exact claim, directly refutes it, is merely related, or is insufficient. Shared names or keywords are not proof; a metaphorical use of a word such as "capital" does not establish a country's capital. For every FC record, mark DIRECT only if it reviews the same proposition.
3. DOMAIN-AWARE SOURCING: Do not assume every claim is a news claim. Prefer primary texts and reputable scholarly/catalog sources for literature, archives and academic histories for history, and official legislation or court records for law. For legal claims, state jurisdiction and effective date when sources provide them; do not present this as legal advice. Model memory alone is context, never evidence.
4. SOCIAL SOURCES: A public post may establish that an account published a statement only when its original page and provenance are available; it does not independently prove the statement's truth. Reposts and copied posts are not independent sources.
5. CHAIN-OF-THOUGHT INTERNAL CHECK (do not dump raw scratchpad):
   - Compare consensus vs. contradictions across independent sources.
   - Check publication dates (detect old news recirculated as today).
   - Detect sensationalism, all-caps urgency bait, or distorted quotes/statistics.
6. Classify certainty strictly as ONE of:
   - CONFIRMED_MULTIPLE_SOURCES (>= 2 independent credible sources directly confirm the exact claim)
   - FALSE (certified fact-checkers or credible press explicitly refute/debunk the claim)
   - OUT_OF_CONTEXT (real news exists, but date, quote, or context is distorted)
   - EXAGGERATED (partial factual basis exists, but scope, numbers, or impact are overstated)
   - NO_EVIDENCE (insufficient corroborated evidence after quality filtering)
7. Estimate a supporting reliability score (0–95, never 100%).
8. If sub-claims were listed above, output their individual statuses in CLAIMS_STATUS using pipe-separated items: C1=supported|refuted|misleading|unverified; C2=...
9. In ANALYSIS, cite direct evidence with source numbers; label related-only sources as related and never present them as proof. Write in ${responseLanguageName}, citing source numbers like [1], [2] (and [REF-1] for reference excerpts). ${memoryDirectives}

Reply in EXACTLY this structure:
CERTAINTY: CONFIRMED_MULTIPLE_SOURCES or FALSE or OUT_OF_CONTEXT or EXAGGERATED or NO_EVIDENCE
SCORE: <integer 0-95>
FLAGS: <comma-separated short warning signs in ${responseLanguageName}, or NONE>
SOURCE_RELATIONS: <semicolon-separated like [1]=DIRECT_SUPPORT; [2]=RELATED_ONLY; or NONE>
FACT_CHECK_RELATIONS: <semicolon-separated like FC-1=DIRECT; FC-2=RELATED; or NONE>
CLAIMS_STATUS: <semicolon-separated like C1=unverified; or NONE>
ANALYSIS: <your grounded cited analysis in ${responseLanguageName}>`;

  try {
    const stream = await ai.models.generateContentStream({
      model: routedModel,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let fullText = '';
    let streamedAnalysisStarted = false;
    let emittedLength = 0;
    const groundingSources: MatchedSourceItem[] = [];
    const seenGroundingUris = new Set<string>();

    for await (const chunk of stream) {
      const piece = chunk.text || '';
      if (piece) {
        fullText += piece;
        if (onAnalysisChunk) {
          if (!streamedAnalysisStarted) {
            const idx = fullText.search(/ANALYSIS:\s*/i);
            if (idx !== -1) {
              const afterMarker = fullText.slice(idx).replace(/^ANALYSIS:\s*/i, '');
              streamedAnalysisStarted = true;
              if (afterMarker.length > emittedLength) {
                const delta = afterMarker.slice(emittedLength);
                emittedLength = afterMarker.length;
                onAnalysisChunk(delta);
              }
            }
          } else {
            const idx = fullText.search(/ANALYSIS:\s*/i);
            const afterMarker = idx !== -1 ? fullText.slice(idx).replace(/^ANALYSIS:\s*/i, '') : '';
            if (afterMarker.length > emittedLength) {
              const delta = afterMarker.slice(emittedLength);
              emittedLength = afterMarker.length;
              onAnalysisChunk(delta);
            }
          }
        }
      }

      const metaChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      for (const gc of metaChunks) {
        const web = (gc as { web?: { uri?: string; title?: string } }).web;
        if (
          web?.uri &&
          !seenGroundingUris.has(web.uri) &&
          /^https?:\/\//i.test(web.uri) &&
          !web.uri.includes('vertexaisearch.cloud.google.com') &&
          !isLowCredibilityBlogOrForum(web.uri, web.title || '')
        ) {
          seenGroundingUris.add(web.uri);
          let domain = 'Web source';
          try {
            domain = new URL(web.uri).hostname.replace(/^www\./i, '');
          } catch {
            domain = 'Web source';
          }
          groundingSources.push({
            title: web.title || web.uri,
            source: domain,
            publishedAt: '',
            link: web.uri,
            isFactCheck: looksLikeDebunkHeadline(web.title || '', domain),
            trustTier: classifyTrustTier(domain, web.uri),
          });
        }
      }
    }

    const text = fullText.trim();
    const certMatch = text.match(
      /CERTAINTY:\s*(CONFIRMED_MULTIPLE_SOURCES|FALSE|OUT_OF_CONTEXT|EXAGGERATED|NO_EVIDENCE)/i
    );
    const scoreMatch = text.match(/SCORE:\s*(\d{1,3})/i);
    const flagsMatch = text.match(/FLAGS:\s*(.+)/i);
    const sourceRelationsMatch = text.match(/SOURCE_RELATIONS:\s*([^\r\n]*)/i);
    const factCheckRelationsMatch = text.match(/FACT_CHECK_RELATIONS:\s*([^\r\n]*)/i);
    const claimsStatusMatch = text.match(/CLAIMS_STATUS:\s*(.+)/i);
    const analysisMatch = text.match(/ANALYSIS:\s*([\s\S]+)/i);

    const rawCert = certMatch ? certMatch[1].toUpperCase() : 'NO_EVIDENCE';
    const verdict: GroundedVerdictCategory =
      rawCert === 'CONFIRMED_MULTIPLE_SOURCES' ||
      rawCert === 'FALSE' ||
      rawCert === 'OUT_OF_CONTEXT' ||
      rawCert === 'EXAGGERATED'
        ? rawCert
        : 'NO_EVIDENCE';

    const parsedScore = scoreMatch ? Math.min(95, Math.max(0, Number(scoreMatch[1]))) : null;
    const rawFlags = flagsMatch ? flagsMatch[1].trim() : '';
    const flags =
      rawFlags && !/^none$/i.test(rawFlags)
        ? rawFlags
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter((s) => s.length >= 3)
            .slice(0, 4)
        : [];

    const rawClaimStatuses = claimsStatusMatch ? claimsStatusMatch[1].trim() : '';
    const statusMap = new Map<number, 'supported' | 'refuted' | 'misleading' | 'unverified'>();
    if (rawClaimStatuses && !/^none$/i.test(rawClaimStatuses)) {
      for (const pair of rawClaimStatuses.split(';')) {
        const m = pair.trim().match(/C(\d+)\s*=\s*(supported|refuted|misleading|unverified)/i);
        if (m) {
          const idx = Number(m[1]) - 1;
          const st = m[2].toLowerCase() as 'supported' | 'refuted' | 'misleading' | 'unverified';
          statusMap.set(idx, st);
        }
      }
    }

    const claimStatuses = extractedClaims.map((claim, idx) => ({
      claim,
      status: statusMap.get(idx) || 'unverified',
    }));

    const sourceRelationMap = new Map<
      number,
      'direct_support' | 'direct_refutation' | 'related_only' | 'insufficient'
    >();
    const sourceRelationPattern =
      /\[?(\d+)\]?\s*=\s*(DIRECT_SUPPORT|DIRECT_REFUTATION|RELATED_ONLY|INSUFFICIENT)/gi;
    let sourceRelationMatch: RegExpExecArray | null;
    while ((sourceRelationMatch = sourceRelationPattern.exec(sourceRelationsMatch?.[1] || ''))) {
      const index = Number(sourceRelationMatch[1]) - 1;
      if (index >= 0 && index < retrievedSources.slice(0, 8).length) {
        const relation = sourceRelationMatch[2].toUpperCase();
        sourceRelationMap.set(
          index,
          relation === 'DIRECT_SUPPORT'
            ? 'direct_support'
            : relation === 'DIRECT_REFUTATION'
              ? 'direct_refutation'
              : relation === 'RELATED_ONLY'
                ? 'related_only'
                : 'insufficient'
        );
      }
    }

    const factCheckRelationMap = new Map<number, 'direct' | 'related'>();
    const factCheckRelationPattern = /FC-(\d+)\s*=\s*(DIRECT|RELATED)/gi;
    let factCheckRelationMatch: RegExpExecArray | null;
    while (
      (factCheckRelationMatch = factCheckRelationPattern.exec(
        factCheckRelationsMatch?.[1] || ''
      ))
    ) {
      const index = Number(factCheckRelationMatch[1]) - 1;
      if (index >= 0 && index < factChecks.slice(0, 4).length) {
        factCheckRelationMap.set(
          index,
          factCheckRelationMatch[2].toUpperCase() === 'DIRECT' ? 'direct' : 'related'
        );
      }
    }

    const citedAnalysis = analysisMatch ? analysisMatch[1].trim() : '';

    return {
      verdict,
      score: parsedScore,
      flags,
      citedAnalysis,
      claimStatuses,
      sourceRelations: retrievedSources
        .slice(0, 8)
        .map((_, index) => sourceRelationMap.get(index) || 'insufficient'),
      factCheckRelations: factChecks
        .slice(0, 4)
        .map((_, index) => factCheckRelationMap.get(index) || 'unknown'),
      groundingSources,
    };
  } catch {
    return null;
  }
}

// =========================================================================
// STAGE 5: Final Validation & Guardrails (Hallucination Check + PII & Tone Filter)
// =========================================================================
function sanitizeSensitiveAndTone(text: string): string {
  return text
    // Redact raw emails or long phone numbers accidentally echoed
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email-redacted]')
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,3}\d{3,4}\b/g, (m) =>
      m.replace(/\D/g, '').length >= 9 ? '[phone-redacted]' : m
    )
    .trim();
}

async function runFinalGuardrails(
  draftAnalysis: string,
  retrievedSources: MatchedSourceItem[],
  ragChunks: string[],
  lang: ServerLang
): Promise<{
  sanitizedAnalysis: string;
  guardrailStatus: 'passed' | 'adjusted_ungrounded' | 'insufficient_evidence';
}> {
  const safeText = sanitizeSensitiveAndTone(draftAnalysis);
  if (!safeText) {
    return { sanitizedAnalysis: safeText, guardrailStatus: 'insufficient_evidence' };
  }

  // Strip any raw URLs in analysis that were not present in retrieved sources
  const allowedDomains = new Set<string>();
  for (const s of retrievedSources) {
    try {
      allowedDomains.add(new URL(s.link).hostname.replace(/^www\./i, '').toLowerCase());
    } catch {
      // ignore
    }
  }
  const urlVerifiedText = safeText.replace(/https?:\/\/[^\s)]+/gi, (foundUrl) => {
    try {
      const host = new URL(foundUrl).hostname.replace(/^www\./i, '').toLowerCase();
      if (allowedDomains.has(host)) return foundUrl;
    } catch {
      // ignore
    }
    return '[unverified-link-removed]';
  });

  const ai = getGeminiClient();
  if (!ai || (retrievedSources.length === 0 && ragChunks.length === 0)) {
    return {
      sanitizedAnalysis: urlVerifiedText,
      guardrailStatus:
        retrievedSources.length === 0 && ragChunks.length === 0 ? 'insufficient_evidence' : 'passed',
    };
  }

  try {
    const contextDigest = [
      ...retrievedSources.slice(0, 8).map((s, i) => `[${i + 1}] ${s.source}: ${s.title} ${s.snippet || ''}`),
      ...ragChunks.map((c, i) => `[REF-${i + 1}] ${c}`),
    ]
      .join('\n')
      .slice(0, 3500);

    const responseLanguageName = lang === 'pt' ? 'Portuguese' : lang === 'es' ? 'Spanish' : 'English';
    const checkRes = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `You are a strict hallucination & brand-safety guardrail reviewer.
Retrieved Evidence:
${contextDigest}

Draft Analysis:
"${urlVerifiedText}"

Verify:
1. Are factual claims and numbers in the Draft Analysis supported by the Retrieved Evidence above (no invented URLs, dates, or statistics)?
2. Is the tone calm, respectful, free of offensive language or personal data?

Return JSON strictly matching schema:
- grounded: true if claims align with the Retrieved Evidence (or cleanly state lack of evidence), false if hallucinated claims appear.
- revisedText: if grounded is true, return empty string; if false, rewrite a short strictly grounded version in ${responseLanguageName}.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grounded: { type: Type.BOOLEAN },
            revisedText: { type: Type.STRING },
          },
          required: ['grounded'],
        },
      },
    });

    const parsed = JSON.parse((checkRes.text || '{}').trim()) as {
      grounded?: boolean;
      revisedText?: string;
    };

    if (parsed.grounded === false && parsed.revisedText?.trim()) {
      return {
        sanitizedAnalysis: sanitizeSensitiveAndTone(parsed.revisedText.trim()),
        guardrailStatus: 'adjusted_ungrounded',
      };
    }

    return {
      sanitizedAnalysis: urlVerifiedText,
      guardrailStatus: 'passed',
    };
  } catch {
    return {
      sanitizedAnalysis: urlVerifiedText,
      guardrailStatus: 'passed',
    };
  }
}

async function emitWordsSmoothly(
  text: string,
  onChunk: (delta: string) => void
): Promise<void> {
  const words = text.split(/(\s+)/);
  for (let i = 0; i < words.length; i += 2) {
    const piece = words.slice(i, i + 2).join('');
    if (piece) onChunk(piece);
    await new Promise((r) => setTimeout(r, 12));
  }
}

async function runVerificationPipeline(
  body: VerifyRequestBody,
  onStage?: (stage: StreamStageServer) => void,
  onChunk?: (delta: string) => void
): Promise<VerifyResponsePayload> {
  const lang = normalizeLang(body.lang);
  const msgs = SERVER_MESSAGES[lang];
  const mediaType: MediaTypeServer = body.type || 'link';
  const rawContent = (body.content || '').trim();
  const detectedUrl = extractUrlFromText(rawContent);

  onStage?.('checking_cache');
  const cacheKey = buildVerifyCacheKey(body, lang);
  if (cacheKey) {
    const cachedHit = getCachedVerification(cacheKey);
    if (cachedHit) {
      if (onChunk && cachedHit.citedAnalysis) {
        onStage?.('streaming_response');
        await emitWordsSmoothly(cachedHit.citedAnalysis, onChunk);
      }
      return cachedHit;
    }
  }

  let extractedDocText = '';
  if (body.fileDataBase64 && mediaType === 'document') {
    onStage?.('reading_document');
    extractedDocText = await extractDocumentText(
      body.fileDataBase64,
      body.mimeType,
      body.fileName
    );
  }

  // Resolve canonical domain & headers safely via HEAD request + URL slug (avoids HTML scraping)
  let realSource: string | null = body.sourceHint?.trim() || null;
  let realDate: string | null = body.publishedAtHint?.trim() || null;
  let realOriginalLink: string | null = detectedUrl;
  let extractedTitle = (body.titleHint || '').trim();
  const pageExcerpt = '';

  if (detectedUrl) {
    try {
      const headRes = await fetchWithTimeout(detectedUrl, 5000, { method: 'HEAD' });
      const finalUrl = headRes.url || detectedUrl;
      if (!finalUrl.includes('news.google.com') && !finalUrl.includes('consent.google.com')) {
        realOriginalLink = finalUrl;
      }

      if (!extractedTitle) {
        extractedTitle = extractTitleFromUrlSlug(finalUrl) || extractTitleFromUrlSlug(detectedUrl);
      }
    } catch {
      if (!extractedTitle) {
        extractedTitle = extractTitleFromUrlSlug(detectedUrl);
      }
    }
  }

  let baseInputText =
    extractedTitle || (!detectedUrl ? rawContent : '') || extractedDocText.slice(0, 220);
  if (
    !baseInputText &&
    body.fileDataBase64 &&
    body.mimeType &&
    (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio')
  ) {
    onStage?.('reading_document');
    const extractedFromMedia = await extractMediaSearchQueryWithGemini(
      mediaType,
      body.fileDataBase64,
      body.mimeType
    );
    if (extractedFromMedia) {
      baseInputText = extractedFromMedia;
    }
  }

  if (
    body.fileDataBase64 &&
    (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') &&
    !baseInputText
  ) {
    const note = msgs.mediaExtractionFailed;
    return {
      ok: true,
      type: mediaType,
      seal: 'unverified',
      sealLabel: msgs.unverifiedLabel,
      certaintyLabel: msgs.certaintyNoEvidence,
      reliabilityScore: 10,
      redFlags: [],
      source: msgs.notAvailable,
      publishedAt: msgs.notAvailable,
      originalLink: null,
      sourcesCount: 0,
      matchedSources: [],
      factChecks: [],
      citedAnalysis: note,
      extractedClaims: [],
      dateWarning: null,
      pipelineAudit: {
        intent: 'factual_claim',
        normalizedQuery: '',
        claimsExtractedCount: 0,
        retrievedCandidatesCount: 0,
        keptAfterRerankCount: 0,
        discardedLowRelevanceCount: 0,
        hybridVectorUsed: false,
        guardrailStatus: 'insufficient_evidence',
        dateWarning: null,
      },
      queryUsed: body.fileName || '',
      note,
      checkedAt: new Date().toISOString(),
      modelUsed: msgs.notAvailable,
      cached: false,
      ragChunksUsed: 0,
    };
  }

  // Stage 1: Input Understanding, Normalization, Intent & Claim Extraction
  onStage?.('understanding_input');
  const understanding = await understandInputAndExtractClaims(
    baseInputText || rawContent,
    mediaType,
    body.conversationHistory,
    lang
  );
  onStage?.('extracting_claims');

  const searchQueryText = understanding.rewrittenQuery || understanding.normalizedQuery || baseInputText;
  const subClaimsToSearch =
    understanding.extractedClaims.length > 0
      ? understanding.extractedClaims
      : [searchQueryText].filter(Boolean);
  const rerankQueries = Array.from(
    new Set(
      [
        searchQueryText,
        ...subClaimsToSearch,
        ...(understanding.searchQueriesByClaim || []).flatMap((queries) =>
          Object.values(queries)
        ),
      ].filter((query): query is string => Boolean(query?.trim()))
    )
  );

  // Stage 2: Hybrid Retrieval (Vector Embeddings + Keyword + Official Fact-Check + Whitelist + Metadata Filters)
  onStage?.('retrieving_sources');
  const ragPromise = retrieveHybridRagChunks(
    searchQueryText || rawContent,
    body.ragContext || '',
    extractedDocText,
    3
  );

  const claimSearchResults = (
    await Promise.all(
      subClaimsToSearch.slice(0, 3).map(async (subClaim, claimIndex) => {
        const translatedQueries = understanding.searchQueriesByClaim?.[claimIndex] || {};
        const queriesByLanguage: Partial<Record<ServerLang, string>> = {
          ...translatedQueries,
          [lang]: subClaim,
        };

        return Promise.all(
          (['en', 'pt', 'es'] as ServerLang[]).map(async (searchLang) => {
            const cleaned = stripRumorIntros(
              (queriesByLanguage[searchLang] || '').replace(/https?:\/\/\S+/g, '').trim()
            );
            if (!cleaned || cleaned.length < 4) {
              return {
                rssResult: {
                  newsMatches: [] as RssArticle[],
                  factCheckMatches: [] as RssArticle[],
                },
                factCheckEntries: [] as FactCheckEntry[],
                tavilySources: [] as MatchedSourceItem[],
                serperSources: [] as MatchedSourceItem[],
              };
            }

            const isSelectedLanguage = searchLang === lang;
            const [
              rssResult,
              factCheckEntries,
              googleCseSources,
              gnewsSources,
              tavilySources,
              serperSources,
            ] = await Promise.all([
              searchPublicRssForClaim(cleaned, searchLang),
              isSelectedLanguage
                ? searchGoogleFactCheckTools(cleaned, searchLang)
                : Promise.resolve([] as FactCheckEntry[]),
              isSelectedLanguage
                ? searchGoogleCustomSearchIfConfigured(cleaned, searchLang)
                : Promise.resolve([] as MatchedSourceItem[]),
              isSelectedLanguage
                ? searchGNewsIfConfigured(cleaned, searchLang)
                : Promise.resolve([] as MatchedSourceItem[]),
              isSelectedLanguage
                ? searchTavilyIfConfigured(cleaned)
                : Promise.resolve([] as MatchedSourceItem[]),
              isSelectedLanguage
                ? searchSerperIfConfigured(cleaned, searchLang)
                : Promise.resolve([] as MatchedSourceItem[]),
            ]);
            return {
              rssResult,
              factCheckEntries,
              tavilySources: [...googleCseSources, ...gnewsSources, ...tavilySources],
              serperSources,
            };
          })
        );
      })
    )
  ).flat();

  const ragHybrid = await ragPromise;
  const ragChunks = ragHybrid.chunks;

  const matchedSourcesMap = new Map<string, MatchedSourceItem>();
  const factCheckEntriesAll: FactCheckEntry[] = [];
  const seenFcUrls = new Set<string>();
  const allRssNewsMatches: RssArticle[] = [];

  for (const resBundle of claimSearchResults) {
    for (const fc of resBundle.factCheckEntries) {
      if (!seenFcUrls.has(fc.url)) {
        seenFcUrls.add(fc.url);
        factCheckEntriesAll.push(fc);
      }
    }

    for (const fcRss of resBundle.rssResult.factCheckMatches) {
      const candidate: MatchedSourceItem = {
        title: fcRss.title,
        source: fcRss.source,
        publishedAt: fcRss.publishedAt,
        link: fcRss.link,
        isFactCheck: true,
        trustTier: 'fact_checker',
      };
      const key = getSourceDedupeKey(candidate);
      if (!matchedSourcesMap.has(key) && matchesMetadataFilters(candidate, body.metadataFilters)) {
        matchedSourcesMap.set(key, candidate);
      }
    }

    for (const src of [...resBundle.tavilySources, ...resBundle.serperSources]) {
      const key = getSourceDedupeKey(src);
      if (!matchedSourcesMap.has(key) && matchesMetadataFilters(src, body.metadataFilters)) {
        matchedSourcesMap.set(key, src);
      }
    }

    for (const item of resBundle.rssResult.newsMatches) {
      allRssNewsMatches.push(item);
      const candidate: MatchedSourceItem = {
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        link: item.link,
        isFactCheck: looksLikeDebunkHeadline(item.title, item.source),
        trustTier: classifyTrustTier(item.source, item.link),
      };
      const key = getSourceDedupeKey(candidate);
      if (!matchedSourcesMap.has(key) && matchesMetadataFilters(candidate, body.metadataFilters)) {
        matchedSourcesMap.set(key, candidate);
      }
    }
  }

  const rawCandidates = Array.from(matchedSourcesMap.values());
  const cleanedSearchQuery = stripRumorIntros(
    searchQueryText.replace(/https?:\/\/\S+/g, '').trim()
  );
  const claimQueries = [cleanedSearchQuery, ...subClaimsToSearch]
    .map((claim) => stripRumorIntros(claim).trim())
    .filter(Boolean);
  const relevantFactCheckEntries = factCheckEntriesAll.filter((entry) =>
    claimQueries.some((claim) => {
      const claimTokens = tokenize(claim);
      if (claimTokens.length === 0) return false;
      const stats = computeOverlapStats(claimTokens, entry.claimText);
      return (
        stats.ratio >= MIN_CORROBORATION_RELEVANCE &&
        stats.hits >= Math.min(claimTokens.length, 3)
      );
    })
  );

  // Stage 3: Top-20 Reranking & Quality Cutoff Threshold
  onStage?.('reranking_sources');
  const rerankOutcome = await rerankAndFilterCandidates(
    rerankQueries,
    rawCandidates
  );

  const preAiSources = rerankOutcome.kept;
  const independentlyRerankedSources = preAiSources.slice();
  const cutoffTriggered =
    rawCandidates.length > 0 &&
    preAiSources.length === 0 &&
    ragChunks.length === 0 &&
    relevantFactCheckEntries.length === 0;

  // Model Routing: Flash-Lite for simple single-claim checks, Gemini Hydrogen for complex/multi-claim/RAG/document checks
  const routedModel = selectRoutedModel(
    mediaType,
    searchQueryText.length,
    Boolean(extractedDocText),
    ragChunks.length,
    preAiSources.length,
    subClaimsToSearch.length
  );

  // Stage 4: Synthesis & Reasoning ("The Judge" with Chain-of-Thought)
  onStage?.('analyzing_content');
  let streamedAnyChunk = false;
  const aiCrossCheck =
    !cutoffTriggered && searchQueryText && searchQueryText.length >= 6
      ? await analyzeAndCrossCheckWithAI(
          searchQueryText,
          subClaimsToSearch,
          preAiSources,
          relevantFactCheckEntries,
          pageExcerpt,
          ragChunks,
          body.memory,
          routedModel,
          lang,
          onChunk
            ? (delta) => {
                if (!streamedAnyChunk) {
                  streamedAnyChunk = true;
                  onStage?.('streaming_response');
                }
                onChunk(delta);
              }
            : undefined
        )
      : null;

  preAiSources.forEach((source, index) => {
    source.evidenceRelation = aiCrossCheck?.sourceRelations[index] || 'insufficient';
  });

  const directlyRelevantFactCheckEntries = relevantFactCheckEntries
    .slice(0, 4)
    .filter((_, index) => aiCrossCheck?.factCheckRelations[index] === 'direct');

  if (aiCrossCheck?.groundingSources) {
    for (const g of aiCrossCheck.groundingSources) {
      const key = getSourceDedupeKey(g);
      if (!matchedSourcesMap.has(key) && matchesMetadataFilters(g, body.metadataFilters)) {
        g.evidenceRelation = 'insufficient';
        preAiSources.push(g);
        matchedSourcesMap.set(key, g);
      }
    }
  }

  const tierOrder: Record<SourceTrustTier, number> = {
    fact_checker: 0,
    official_institutional: 1,
    established_press: 2,
    web_source: 3,
  };

  const matchedSources = preAiSources.sort(
    (a, b) =>
      (b.relevanceScore || 0) - (a.relevanceScore || 0) ||
      tierOrder[a.trustTier || 'web_source'] - tierOrder[b.trustTier || 'web_source']
  );

  const directEvidenceSources = getIndependentDirectEvidenceSources(
    independentlyRerankedSources
  );
  const supportingEvidenceSources = directEvidenceSources.filter(
    (source) => source.evidenceRelation === 'direct_support'
  );
  const refutingEvidenceSources = directEvidenceSources.filter(
    (source) => source.evidenceRelation === 'direct_refutation'
  );
  const leadEvidence = directEvidenceSources[0] || matchedSources[0];
  if (!realSource && leadEvidence) {
    realSource = leadEvidence.source;
  }
  if (!realDate && leadEvidence?.publishedAt) {
    realDate = leadEvidence.publishedAt;
  }
  if (!realOriginalLink && leadEvidence) {
    realOriginalLink = leadEvidence.link;
  }

  // Date Verification: detect old articles recirculated as today/urgent
  let dateWarning: string | null = null;
  if (body.publishedAtHint?.trim() && realDate) {
    const parsedTs = new Date(realDate).getTime();
    if (Number.isFinite(parsedTs)) {
      const ageDays = Math.floor((Date.now() - parsedTs) / (1000 * 60 * 60 * 24));
      const framesAsCurrent =
        /\b(today|tonight|now|urgent|breaking|hoje|agora|urgente|amanhã|hoy|ahora|mañana)\b/i.test(
          rawContent
        );
      if (ageDays >= 180 && framesAsCurrent) {
        dateWarning = msgs.dateWarningOld(ageDays);
      }
    }
  }

  const sourcesCount = directEvidenceSources.length;
  const supportingSourcesCount = supportingEvidenceSources.length;

  // Structured Certainty Classification across 5 Verdict Categories
  const corroboratingFactChecks = directEvidenceSources.filter(
    (source) =>
      source.evidenceRelation === 'direct_refutation' &&
      source.isFactCheck &&
      source.trustTier === 'fact_checker'
  );
  const hasDebunkHeadline = corroboratingFactChecks.length > 0;
  const hasFactCheckFalse = directlyRelevantFactCheckEntries.some(
    (fc) =>
      classifyTrustTier(fc.publisher, fc.url) === 'fact_checker' &&
      /\b(false|falso|falsa|fake|pants on fire|hoax|bulo|mentira)\b/i.test(fc.rating)
  );
  const hasFactCheckMisleading = directlyRelevantFactCheckEntries.some(
    (fc) =>
      classifyTrustTier(fc.publisher, fc.url) === 'fact_checker' &&
      /\b(misleading|enganoso|enganosa|out of context|fora de contexto|fuera de contexto|partly|exaggerated|exagerado)\b/i.test(
        fc.rating
      )
  );
  const hasRumorFraming = RUMOR_FRAMING_REGEX.test(rawContent);
  const cleanTokens = tokenize(cleanedSearchQuery);
  const requiredRatio = hasRumorFraming ? 0.8 : 0.55;

  const strictlyCorroboratingNews = getIndependentDirectEvidenceSources(
    independentlyRerankedSources.filter((source) => {
      if (
        source.evidenceRelation !== 'direct_support' ||
        source.isFactCheck ||
        !allRssNewsMatches.some(
          (item) =>
            item.source.toLowerCase().trim() === source.source.toLowerCase().trim() &&
            item.title === source.title &&
            !looksLikeDebunkHeadline(item.title, item.source)
        ) ||
        cleanTokens.length === 0
      ) {
        return false;
      }
      const stats = computeOverlapStats(cleanTokens, source.title);
      const requiredHits = hasRumorFraming ? 4 : Math.min(cleanTokens.length, 3);
      return (
        (source.relevanceScore || 0) >= MIN_CORROBORATION_RELEVANCE &&
        stats.ratio >= requiredRatio &&
        stats.hits >= requiredHits
      );
    })
  );

  let seal: SealStatus = 'unverified';
  let sealLabel = msgs.unverifiedLabel;
  let certaintyLabel = msgs.certaintyNoEvidence;

  if (cutoffTriggered) {
    seal = 'unverified';
    sealLabel = msgs.unverifiedLabel;
    certaintyLabel = msgs.certaintyNoEvidence;
  } else if (
    hasFactCheckFalse ||
    hasDebunkHeadline ||
    (aiCrossCheck?.verdict === 'FALSE' &&
      (refutingEvidenceSources.length >= 2 || corroboratingFactChecks.length > 0))
  ) {
    seal = 'false_claim';
    sealLabel = msgs.falseLabel;
    certaintyLabel = msgs.certaintyFalse;
  } else if (
    aiCrossCheck?.verdict === 'EXAGGERATED' &&
    (sourcesCount > 0 || directlyRelevantFactCheckEntries.length > 0)
  ) {
    seal = 'exaggerated';
    sealLabel = msgs.exaggeratedLabel;
    certaintyLabel = msgs.certaintyExaggerated;
  } else if (
    hasFactCheckMisleading ||
    (aiCrossCheck?.verdict === 'OUT_OF_CONTEXT' &&
      (sourcesCount > 0 || directlyRelevantFactCheckEntries.length > 0)) ||
    (Boolean(dateWarning) && sourcesCount > 0)
  ) {
    seal = 'out_of_context';
    sealLabel = msgs.outOfContextLabel;
    certaintyLabel = msgs.certaintyOutOfContext;
  } else if (
    Boolean(realOriginalLink) &&
    supportingSourcesCount >= 2 &&
    (aiCrossCheck?.verdict === 'CONFIRMED_MULTIPLE_SOURCES' ||
      (!aiCrossCheck && strictlyCorroboratingNews.length >= 2))
  ) {
    seal = 'verified_public_sources';
    sealLabel = msgs.verifiedLabel;
    certaintyLabel = msgs.certaintyConfirmed;
  } else if (supportingSourcesCount >= 2 && hasRumorFraming) {
    seal = 'out_of_context';
    sealLabel = msgs.outOfContextLabel;
    certaintyLabel = msgs.certaintyOutOfContext;
  } else {
    seal = 'unverified';
    sealLabel = msgs.unverifiedLabel;
    certaintyLabel = msgs.certaintyNoEvidence;
  }

  let citedAnalysis = aiCrossCheck?.citedAnalysis || '';
  const aiVerdictRejectedByEvidence =
    seal === 'unverified' &&
    aiCrossCheck !== null &&
    aiCrossCheck.verdict !== 'NO_EVIDENCE';
  if (cutoffTriggered) {
    citedAnalysis = msgs.noteCutoffInsufficient;
  } else if (aiVerdictRejectedByEvidence || (matchedSources.length > 0 && sourcesCount === 0)) {
    citedAnalysis = msgs.noteInsufficientCorroboration;
  } else if (!citedAnalysis && directEvidenceSources.length > 0) {
    const topCitations = directEvidenceSources
      .slice(0, 2)
      .map((m, idx) => `[${idx + 1}] ${m.source}`)
      .join(', ');
    if (seal === 'verified_public_sources') {
      citedAnalysis = `${msgs.noteConfirmed(sourcesCount)} (${topCitations})`;
    } else if (seal === 'false_claim') {
      citedAnalysis = `${msgs.noteFalse} (${topCitations})`;
    } else if (seal === 'exaggerated') {
      citedAnalysis = `${msgs.noteExaggerated} (${topCitations})`;
    } else if (seal === 'out_of_context') {
      citedAnalysis = `${msgs.noteOutOfContext} (${topCitations})`;
    } else {
      citedAnalysis = `${msgs.noteOneSource} (${topCitations})`;
    }
  }

  let summaryNote = '';
  if (cutoffTriggered) {
    summaryNote = msgs.noteCutoffInsufficient;
  } else if (seal === 'verified_public_sources') {
    summaryNote = msgs.noteConfirmed(sourcesCount);
  } else if (seal === 'false_claim') {
    summaryNote = msgs.noteFalse;
  } else if (seal === 'exaggerated') {
    summaryNote = msgs.noteExaggerated;
  } else if (seal === 'out_of_context') {
    summaryNote = msgs.noteOutOfContext;
  } else if (sourcesCount === 1) {
    summaryNote = msgs.noteOneSource;
  } else if (matchedSources.length > 0) {
    summaryNote = msgs.noteInsufficientCorroboration;
  } else if (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') {
    summaryNote = msgs.noteNoMedia;
  } else {
    summaryNote = msgs.noteNoSources;
  }

  const draftAnalysis = citedAnalysis || summaryNote;

  // Stage 5: Final Guardrails (Hallucination check, PII & Safety Tone)
  onStage?.('validating_guardrails');
  const guardrailResult = await runFinalGuardrails(
    draftAnalysis,
    matchedSources,
    ragChunks,
    lang
  );
  const finalAnalysis = guardrailResult.sanitizedAnalysis || summaryNote;

  if (onChunk && !streamedAnyChunk && finalAnalysis) {
    onStage?.('streaming_response');
    await emitWordsSmoothly(finalAnalysis, onChunk);
  }

  const deterministicFlags = detectLinguisticRedFlags(
    rawContent || searchQueryText,
    Boolean(detectedUrl),
    sourcesCount,
    lang
  );
  const mergedRedFlags = Array.from(
    new Set([...(aiCrossCheck?.flags || []), ...deterministicFlags])
  ).slice(0, 4);

  const reliabilityScore = calculateEvidenceStrengthScore(directEvidenceSources);

  const defaultClaimStatus: ExtractedClaimResultServer['status'] =
    seal === 'verified_public_sources'
      ? 'supported'
      : seal === 'false_claim'
        ? 'refuted'
        : seal === 'out_of_context' || seal === 'exaggerated'
          ? 'misleading'
          : 'unverified';

  const finalExtractedClaims: ExtractedClaimResultServer[] =
    seal === 'unverified'
      ? subClaimsToSearch.map((claim) => ({ claim, status: 'unverified' }))
      : aiCrossCheck?.claimStatuses && aiCrossCheck.claimStatuses.length > 0
      ? aiCrossCheck.claimStatuses
      : subClaimsToSearch.map((claim) => ({
          claim,
          status: defaultClaimStatus,
        }));

  const payload: VerifyResponsePayload = {
    ok: true,
    type: mediaType,
    seal,
    sealLabel,
    certaintyLabel,
    reliabilityScore,
    redFlags: mergedRedFlags,
    source: realSource || msgs.notAvailable,
    publishedAt: realDate || msgs.notAvailable,
    originalLink: realOriginalLink || null,
    sourcesCount,
    matchedSources: matchedSources
      .map((source) => ({
        ...source,
        corroboratesClaim:
          source.evidenceRelation === 'direct_support' &&
          directEvidenceSources.some(
          (item) =>
            item.source === source.source &&
            item.title === source.title &&
            item.link === source.link
          ),
      }))
      .slice(0, 8),
    factChecks: directlyRelevantFactCheckEntries,
    citedAnalysis: finalAnalysis,
    extractedClaims: finalExtractedClaims,
    dateWarning,
    pipelineAudit: {
      intent: understanding.intent,
      normalizedQuery: understanding.normalizedQuery,
      rewrittenQuery: understanding.rewrittenQuery,
      claimsExtractedCount: subClaimsToSearch.length,
      retrievedCandidatesCount: rawCandidates.length,
      keptAfterRerankCount: matchedSources.length,
      discardedLowRelevanceCount: rerankOutcome.discardedCount,
      hybridVectorUsed: rerankOutcome.vectorUsed || ragHybrid.vectorUsed,
      guardrailStatus:
        cutoffTriggered || aiVerdictRejectedByEvidence
          ? 'insufficient_evidence'
          : guardrailResult.guardrailStatus,
      dateWarning,
    },
    queryUsed: searchQueryText || body.fileName || rawContent.slice(0, 120),
    note: summaryNote,
    checkedAt: new Date().toISOString(),
    modelUsed: routedModel,
    cached: false,
    ragChunksUsed: ragChunks.length,
  };

  if (cacheKey) {
    setCachedVerification(cacheKey, payload);
  }

  return payload;
}

// Short-lived in-memory RAM cache for optimized WebP/AVIF thumbnails (never written to disk)
const MEDIA_RAM_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MEDIA_RAM_CACHE_MAX_ENTRIES = 60;
const MEDIA_RAM_CACHE_MAX_BYTES = 12 * 1024 * 1024; // 12 MB cap

interface CachedMediaEntry {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  cachedAt: number;
}

const MEDIA_RAM_CACHE = new Map<string, CachedMediaEntry>();

function pruneMediaRamCache() {
  const now = Date.now();
  let totalBytes = 0;
  for (const [k, v] of MEDIA_RAM_CACHE.entries()) {
    if (now - v.cachedAt > MEDIA_RAM_CACHE_TTL_MS) {
      MEDIA_RAM_CACHE.delete(k);
    } else {
      totalBytes += v.buffer.byteLength;
    }
  }
  while (
    MEDIA_RAM_CACHE.size > MEDIA_RAM_CACHE_MAX_ENTRIES ||
    totalBytes > MEDIA_RAM_CACHE_MAX_BYTES
  ) {
    const oldestKey = MEDIA_RAM_CACHE.keys().next().value;
    if (!oldestKey) break;
    const evicted = MEDIA_RAM_CACHE.get(oldestKey);
    if (evicted) totalBytes -= evicted.buffer.byteLength;
    MEDIA_RAM_CACHE.delete(oldestKey);
  }
}

function isSafePublicImageUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return null;
    }
    const ipType = net.isIP(host);
    if (ipType === 4) {
      const parts = host.split('.').map(Number);
      if (
        parts[0] === 10 ||
        parts[0] === 127 ||
        parts[0] === 0 ||
        (parts[0] === 169 && parts[1] === 254) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      ) {
        return null;
      }
    } else if (ipType === 6) {
      if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildOptionalCdnRedirectUrl(rawUrl: string, w: number, h: number, q: number): string | null {
  const cdnBase = (process.env.MEDIA_CDN_BASE_URL || '').trim();
  if (!cdnBase) return null;
  if (cdnBase.includes('{url}')) {
    return cdnBase
      .replace(/\{url\}/g, encodeURIComponent(rawUrl))
      .replace(/\{w\}/g, String(w))
      .replace(/\{h\}/g, String(h))
      .replace(/\{q\}/g, String(q));
  }
  const trimmed = cdnBase.replace(/\/+$/, '');
  if (trimmed.includes('cdn-cgi/image')) {
    return `${trimmed}/width=${w},height=${h},fit=cover,quality=${q},format=auto/${rawUrl}`;
  }
  return `${trimmed}/w_${w},h_${h},c_fill,q_${q},f_auto/${encodeURIComponent(rawUrl)}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Server-side Media Optimization Proxy: streams remote URLs as exact-sized WebP/AVIF thumbnails
  app.get('/api/media', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const parsedUrl = isSafePublicImageUrl(rawUrl);
    if (!parsedUrl) {
      res.status(400).json({ ok: false, error: 'Invalid or disallowed image URL' });
      return;
    }

    const isLite = req.query.lite === '1';
    const ect = typeof req.query.ect === 'string' ? req.query.ect.toLowerCase() : '4g';
    const saveDataHeader = String(req.headers['save-data'] || '').toLowerCase() === 'on';
    const dprRaw = Number(req.query.dpr || 1);
    const dpr = Number.isFinite(dprRaw) ? Math.min(1.5, Math.max(1, dprRaw)) : 1;

    const requestedW = Number(req.query.w || 300);
    const requestedH = Number(req.query.h || 200);
    const baseW = Number.isFinite(requestedW) ? Math.min(1200, Math.max(24, Math.round(requestedW))) : 300;
    const baseH = Number.isFinite(requestedH) ? Math.min(900, Math.max(16, Math.round(requestedH))) : 200;

    const isSlowConn = saveDataHeader || ect === 'slow-2g' || ect === '2g';
    const scaleFactor = isLite ? 1 : isSlowConn ? 0.75 : dpr;
    const targetW = isLite ? 36 : Math.min(1200, Math.round(baseW * scaleFactor));
    const targetH = isLite ? 24 : Math.min(900, Math.round(baseH * scaleFactor));
    const quality = isLite ? 28 : isSlowConn ? 45 : ect === '3g' ? 60 : 72;

    if (!isLite) {
      const cdnRedirect = buildOptionalCdnRedirectUrl(parsedUrl.toString(), targetW, targetH, quality);
      if (cdnRedirect) {
        res.setHeader('Cache-Control', 'public, max-age=7200');
        res.redirect(302, cdnRedirect);
        return;
      }
    }

    const fmtQuery = typeof req.query.fmt === 'string' ? req.query.fmt.toLowerCase() : 'auto';
    const acceptHeader = String(req.headers.accept || '').toLowerCase();
    const useAvif =
      !isLite && (fmtQuery === 'avif' || (fmtQuery === 'auto' && acceptHeader.includes('image/avif')));
    const outputFormat: 'avif' | 'webp' = useAvif ? 'avif' : 'webp';

    const cacheKey = `${parsedUrl.toString()}::${targetW}x${targetH}::${quality}::${outputFormat}::${isLite ? 'lite' : 'std'}`;
    pruneMediaRamCache();
    const cached = MEDIA_RAM_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt <= MEDIA_RAM_CACHE_TTL_MS) {
      MEDIA_RAM_CACHE.delete(cacheKey);
      MEDIA_RAM_CACHE.set(cacheKey, cached);
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=7200, stale-while-revalidate=600');
      res.setHeader('Vary', 'Accept, Save-Data');
      res.setHeader('X-Media-Cache', 'HIT');
      res.setHeader('X-Media-Format', outputFormat);
      res.setHeader('X-Media-Dimensions', `${cached.width}x${cached.height}`);
      res.send(cached.buffer);
      return;
    }

    try {
      const upstream = await fetchWithTimeout(parsedUrl.toString(), 7000, {
        headers: {
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
        },
      });
      if (!upstream.ok) {
        res.status(502).json({ ok: false, error: 'Upstream image unavailable' });
        return;
      }
      const upstreamType = (upstream.headers.get('content-type') || '').toLowerCase();
      if (!upstreamType.startsWith('image/')) {
        res.status(415).json({ ok: false, error: 'Unsupported media type' });
        return;
      }
      const contentLength = Number(upstream.headers.get('content-length') || 0);
      if (contentLength > 6 * 1024 * 1024) {
        res.status(413).json({ ok: false, error: 'Source image exceeds size cap' });
        return;
      }

      const rawArrayBuf = await upstream.arrayBuffer();
      if (rawArrayBuf.byteLength > 6 * 1024 * 1024) {
        res.status(413).json({ ok: false, error: 'Source image exceeds size cap' });
        return;
      }

      const rawBuffer = Buffer.from(rawArrayBuf);
      let pipeline = sharp(rawBuffer).rotate().resize(targetW, targetH, {
        fit: 'cover',
        position: 'attention',
      });

      if (isLite) {
        pipeline = pipeline.blur(3.5);
      }

      const optimizedBuffer =
        outputFormat === 'avif'
          ? await pipeline.avif({ quality, effort: 3 }).toBuffer()
          : await pipeline.webp({ quality, effort: 4 }).toBuffer();

      const outType = outputFormat === 'avif' ? 'image/avif' : 'image/webp';
      MEDIA_RAM_CACHE.set(cacheKey, {
        buffer: optimizedBuffer,
        contentType: outType,
        width: targetW,
        height: targetH,
        cachedAt: Date.now(),
      });
      pruneMediaRamCache();

      res.setHeader('Content-Type', outType);
      res.setHeader('Cache-Control', 'public, max-age=7200, stale-while-revalidate=600');
      res.setHeader('Vary', 'Accept, Save-Data');
      res.setHeader('X-Media-Cache', 'MISS');
      res.setHeader('X-Media-Format', outputFormat);
      res.setHeader('X-Media-Dimensions', `${targetW}x${targetH}`);
      res.setHeader('X-Original-Bytes', String(rawBuffer.byteLength));
      res.setHeader('X-Optimized-Bytes', String(optimizedBuffer.byteLength));
      res.send(optimizedBuffer);
    } catch {
      res.status(502).json({ ok: false, error: 'Failed to optimize remote image' });
    }
  });

  app.get('/api/geocode-country', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const lang = normalizeLang(req.query.lang);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ ok: false, country: 'Angola' });
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${lang}`;
      const response = await fetchWithTimeout(url, 6000);
      if (!response.ok) {
        res.json({ ok: false, country: 'Angola' });
        return;
      }
      const data = (await response.json()) as { address?: { country?: string } };
      const country = data?.address?.country?.trim() || 'Angola';
      res.json({ ok: true, country });
    } catch {
      res.json({ ok: false, country: 'Angola' });
    }
  });

  app.get('/api/news', async (req, res) => {
    const rawCountry = typeof req.query.country === 'string' ? req.query.country.trim() : 'Angola';
    const country = rawCountry || 'Angola';
    const lang = normalizeLang(req.query.lang);
    const forceRefresh = req.query.refresh === 'true';
    const msgs = SERVER_MESSAGES[lang];
    const cacheKey = `${country.toLowerCase()}::${lang}`;

    if (!forceRefresh) {
      const cached = NEWS_SERVER_CACHE.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < NEWS_SERVER_CACHE_TTL_MS) {
        res.json({
          ok: true,
          country,
          cached: true,
          items: cached.items,
        });
        return;
      }
    }

    try {
      const feedConfigs = getCountryFeedUrls(country, lang);
      const [feedResults, gnewsArticles] = await Promise.all([
        Promise.all(feedConfigs.map((cfg) => fetchRssFeed(cfg.url, cfg.source))),
        fetchGNewsHeadlinesIfConfigured(country, lang),
      ]);

      const seenLinks = new Set<string>();
      const seenTitles = new Set<string>();
      const merged: RssArticle[] = [];

      for (const batch of [...feedResults, gnewsArticles]) {
        for (const item of batch) {
          const titleKey = item.title.toLowerCase().slice(0, 70);
          if (!seenLinks.has(item.link) && !seenTitles.has(titleKey)) {
            seenLinks.add(item.link);
            seenTitles.add(titleKey);
            merged.push(item);
          }
        }
      }

      merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      if (merged.length === 0) {
        res.status(503).json({
          ok: false,
          error: msgs.newsError,
          country,
          items: [],
        });
        return;
      }

      const topItems = merged.slice(0, 30);
      NEWS_SERVER_CACHE.set(cacheKey, { cachedAt: Date.now(), items: topItems });

      res.json({
        ok: true,
        country,
        cached: false,
        items: topItems,
      });
    } catch {
      res.status(503).json({
        ok: false,
        error: msgs.newsError,
        country,
        items: [],
      });
    }
  });

  app.post('/api/verify', async (req, res) => {
    const body = req.body as VerifyRequestBody;
    const lang = normalizeLang(body.lang);
    const msgs = SERVER_MESSAGES[lang];
    const rawContent = (body.content || '').trim();

    if (!rawContent && !body.fileDataBase64) {
      res.status(400).json({
        ok: false,
        error: msgs.emptyInputError,
      });
      return;
    }

    try {
      const result = await runVerificationPipeline(body);
      res.json(result);
    } catch {
      res.status(500).json({
        ok: false,
        error: msgs.newsError,
      });
    }
  });

  app.post('/api/verify/stream', async (req, res) => {
    const body = req.body as VerifyRequestBody;
    const lang = normalizeLang(body.lang);
    const msgs = SERVER_MESSAGES[lang];
    const rawContent = (body.content || '').trim();

    if (!rawContent && !body.fileDataBase64) {
      res.status(400).json({
        ok: false,
        error: msgs.emptyInputError,
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (eventObj: Record<string, unknown>) => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(eventObj)}\n\n`);
    };

    try {
      const result = await runVerificationPipeline(
        body,
        (stage) => writeEvent({ type: 'stage', stage }),
        (text) => writeEvent({ type: 'chunk', text })
      );
      writeEvent({ type: 'result', data: result });
    } catch {
      writeEvent({ type: 'error', error: msgs.newsError });
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ektheto server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
