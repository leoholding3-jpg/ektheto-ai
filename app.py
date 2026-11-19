from __future__ import annotations

import os
import math
import hashlib
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

import truststore

truststore.inject_into_ssl()

import requests
import streamlit as st
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError


# Load project-root credentials before Streamlit initializes the page.
PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")


API_URL = "https://api.sightengine.com/1.0/check.json"
REQUEST_TIMEOUT = 30
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
SUPPORTED_IMAGE_FORMATS = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "BMP": "image/bmp",
}
LANGUAGES = {"pt": "Português", "en": "English", "es": "Español"}

TEXT: dict[str, dict[str, str]] = {
    "pt": {
        "title": "Ektheto — Detector de deepfakes",
        "tagline": "Analisa imagens em busca de sinais de geração por IA.",
        "description": (
            "Carrega uma imagem e consulta o Sightengine. O ficheiro só é enviado "
            "quando selecionas Analisar; não guardamos a imagem nem o histórico "
            "fora desta sessão."
        ),
        "language": "Idioma",
        "analysis_tab": "Analisar imagem",
        "news_tab": "EkthetoRadar",
        "news_demo_notice": (
            "Demonstração local: assinala termos e compara grafias de domínio com um catálogo limitado. "
            "Não abre páginas, consulta fontes externas nem verifica factos."
        ),
        "history_tab": "Histórico da sessão",
        "upload_heading": "Imagem para análise",
        "upload_guidance": "A imagem só é enviada ao Sightengine quando selecionas Analisar imagem.",
        "upload": "Seleciona uma imagem (JPG, PNG, WEBP ou BMP)",
        "analyze": "Analisar imagem",
        "loading": "A analisar a imagem",
        "missing_credentials": (
            "A análise não está configurada. Define SIGHTENGINE_USER e "
            "SIGHTENGINE_SECRET no ambiente ou no ficheiro .env."
        ),
        "invalid_image": "Não foi possível validar a imagem. Carrega um JPG, PNG, WEBP ou BMP válido.",
        "large_image": "A imagem excede o limite de 10 MB.",
        "large_dimensions": "A imagem excede o limite de resolução permitido.",
        "analysis_error": "Não foi possível concluir a análise.",
        "timeout": "A análise demorou demasiado. Tenta novamente mais tarde.",
        "network": "Não foi possível contactar o serviço de análise. Verifica a ligação e tenta novamente.",
        "provider": "O serviço não conseguiu analisar esta imagem.",
        "provider_unavailable": "O serviço de análise está temporariamente indisponível.",
        "provider_credentials": (
            "O Sightengine rejeitou as credenciais. Confirma SIGHTENGINE_USER e "
            "SIGHTENGINE_SECRET nos Secrets do Streamlit Cloud ou no .env local."
        ),
        "provider_rate_limit": "O limite de pedidos do serviço foi atingido. Tenta mais tarde.",
        "invalid_response": "O serviço devolveu uma resposta inválida.",
        "result": "Resultado da análise",
        "score": "Confiança do modelo Sightengine",
        "score_help": "A classificação apresentada usa 80% ou mais como confiança elevada, 20% ou menos como baixa e valores intermédios como inconclusivos. O modelo avalia píxeis, mas não indica quais partes visuais motivaram a pontuação.",
        "high": "Confiança elevada do modelo",
        "high_detail": (
            "O Sightengine atribuiu {score} de confiança de geração ou edição por modelo generativo, "
            "com base nos píxeis. A API não aponta características visuais específicas que expliquem "
            "este valor; não é prova da origem da imagem."
        ),
        "low": "Confiança baixa do modelo",
        "low_detail": (
            "O Sightengine atribuiu {score}. Um valor baixo não confirma que a imagem seja autêntica "
            "ou não tenha sido editada."
        ),
        "inconclusive": "Resultado inconclusivo",
        "inconclusive_detail": (
            "A confiança do modelo está no intervalo intermédio. Confirma a origem da imagem por outras fontes."
        ),
        "generator_detail": "Maior correspondência por gerador (confiança do modelo; não indica uma região visual):",
        "no_generator_detail": "O serviço devolveu apenas a pontuação global; não forneceu detalhe por gerador ou região visual.",
        "disclaimer": (
            "O Sightengine avalia os píxeis e devolve uma pontuação de confiança. Pode haver falsos positivos e negativos; "
            "o valor não identifica por si só a origem nem prova autenticidade."
        ),
        "history_notice": (
            "O histórico contém apenas a hora e o resultado, nunca a imagem. "
            "É apagado quando a sessão termina."
        ),
        "empty_history": "Ainda não há análises nesta sessão.",
        "clear_history": "Limpar histórico da sessão",
        "history_cleared": "Histórico da sessão apagado.",
        "time": "Hora",
        "history_score": "Confiança Sightengine",
        "history_result": "Resultado",
        "version": "Detector de imagens · análise privada por sessão",
    },
    "en": {
        "title": "Ektheto — Deepfake detector",
        "tagline": "Check images for signs of AI generation.",
        "description": (
            "Upload an image and check it with Sightengine. The file is sent only "
            "when you select Analyze; neither the image nor history is stored beyond "
            "this session."
        ),
        "language": "Language",
        "analysis_tab": "Analyze image",
        "news_tab": "EkthetoRadar",
        "news_demo_notice": (
            "Local demo: flags terms and compares domain spellings with a limited catalogue. "
            "It does not open pages, query external sources, or verify facts."
        ),
        "history_tab": "Session history",
        "upload_heading": "Image for analysis",
        "upload_guidance": "The image is sent to Sightengine only when you select Analyze image.",
        "upload": "Choose an image (JPG, PNG, WEBP, or BMP)",
        "analyze": "Analyze image",
        "loading": "Analyzing image",
        "missing_credentials": (
            "Analysis is not configured. Set SIGHTENGINE_USER and "
            "SIGHTENGINE_SECRET in the environment or .env file."
        ),
        "invalid_image": "The image could not be validated. Upload a valid JPG, PNG, WEBP, or BMP.",
        "large_image": "The image exceeds the 10 MB limit.",
        "large_dimensions": "The image exceeds the allowed resolution limit.",
        "analysis_error": "The analysis could not be completed.",
        "timeout": "The analysis took too long. Please try again later.",
        "network": "Could not reach the analysis service. Check your connection and try again.",
        "provider": "The service could not analyze this image.",
        "provider_unavailable": "The analysis service is temporarily unavailable.",
        "provider_credentials": (
            "Sightengine rejected the credentials. Check SIGHTENGINE_USER and "
            "SIGHTENGINE_SECRET in Streamlit Cloud Secrets or the local .env file."
        ),
        "provider_rate_limit": "The service request limit was reached. Try again later.",
        "invalid_response": "The service returned an invalid response.",
        "result": "Analysis result",
        "score": "Sightengine model confidence",
        "score_help": "This display uses 80% or higher as high confidence, 20% or lower as low, and intermediate scores as inconclusive. The model evaluates pixels but does not identify the visual areas behind its score.",
        "high": "High model confidence",
        "high_detail": (
            "Sightengine assigned {score} confidence that the image was generated or edited by a generative model, "
            "based on its pixels. The API does not identify specific visual features behind this value; it is not proof of origin."
        ),
        "low": "Low model confidence",
        "low_detail": (
            "Sightengine assigned {score}. A low value does not confirm that the image is authentic or unedited."
        ),
        "inconclusive": "Inconclusive result",
        "inconclusive_detail": (
            "Model confidence is in the intermediate range. Check the image's origin using other sources."
        ),
        "generator_detail": "Top generator matches (model confidence; not a visual-region explanation):",
        "no_generator_detail": "The service returned only an overall score; it provided no generator or visual-region details.",
        "disclaimer": (
            "Sightengine evaluates pixels and returns a confidence score. False positives and negatives are possible; "
            "the score alone does not identify origin or prove authenticity."
        ),
        "history_notice": (
            "History stores only the time and result, never the image. "
            "It is cleared when the session ends."
        ),
        "empty_history": "There are no analyses in this session yet.",
        "clear_history": "Clear session history",
        "history_cleared": "Session history cleared.",
        "time": "Time",
        "history_score": "Sightengine confidence",
        "history_result": "Result",
        "version": "Image detector · private session analysis",
    },
    "es": {
        "title": "Ektheto — Detector de deepfakes",
        "tagline": "Busca señales de generación por IA en imágenes.",
        "description": (
            "Carga una imagen y consulta Sightengine. El archivo solo se envía "
            "al seleccionar Analizar; ni la imagen ni el historial se guardan "
            "fuera de esta sesión."
        ),
        "language": "Idioma",
        "analysis_tab": "Analizar imagen",
        "news_tab": "EkthetoRadar",
        "news_demo_notice": (
            "Demostración local: señala términos y compara dominios con un catálogo limitado. "
            "No abre páginas, consulta fuentes externas ni verifica hechos."
        ),
        "history_tab": "Historial de sesión",
        "upload_heading": "Imagen para analizar",
        "upload_guidance": "La imagen solo se envía a Sightengine al seleccionar Analizar imagen.",
        "upload": "Selecciona una imagen (JPG, PNG, WEBP o BMP)",
        "analyze": "Analizar imagen",
        "loading": "Analizando la imagen",
        "missing_credentials": (
            "El análisis no está configurado. Define SIGHTENGINE_USER y "
            "SIGHTENGINE_SECRET en el entorno o en el archivo .env."
        ),
        "invalid_image": "No se pudo validar la imagen. Carga un JPG, PNG, WEBP o BMP válido.",
        "large_image": "La imagen supera el límite de 10 MB.",
        "large_dimensions": "La imagen supera el límite de resolución permitido.",
        "analysis_error": "No se pudo completar el análisis.",
        "timeout": "El análisis tardó demasiado. Inténtalo de nuevo más tarde.",
        "network": "No se pudo contactar con el servicio de análisis. Comprueba la conexión e inténtalo de nuevo.",
        "provider": "El servicio no pudo analizar esta imagen.",
        "provider_unavailable": "El servicio de análisis no está disponible temporalmente.",
        "provider_credentials": (
            "Sightengine rechazó las credenciales. Comprueba SIGHTENGINE_USER y "
            "SIGHTENGINE_SECRET en Streamlit Cloud Secrets o en el archivo .env local."
        ),
        "provider_rate_limit": "Se alcanzó el límite de solicitudes. Inténtalo más tarde.",
        "invalid_response": "El servicio devolvió una respuesta no válida.",
        "result": "Resultado del análisis",
        "score": "Confianza del modelo Sightengine",
        "score_help": "La clasificación usa 80% o más como confianza alta, 20% o menos como baja y los valores intermedios como no concluyentes. El modelo evalúa píxeles, pero no señala las zonas visuales que motivaron la puntuación.",
        "high": "Confianza alta del modelo",
        "high_detail": (
            "Sightengine asignó {score} de confianza de generación o edición por un modelo generativo, "
            "basada en los píxeles. La API no señala características visuales concretas que expliquen este valor; no prueba el origen."
        ),
        "low": "Confianza baja del modelo",
        "low_detail": (
            "Sightengine asignó {score}. Un valor bajo no confirma que la imagen sea auténtica o no haya sido editada."
        ),
        "inconclusive": "Resultado no concluyente",
        "inconclusive_detail": (
            "La confianza del modelo está en el intervalo intermedio. Comprueba el origen de la imagen con otras fuentes."
        ),
        "generator_detail": "Mayores coincidencias por generador (confianza del modelo; no indica una región visual):",
        "no_generator_detail": "El servicio solo devolvió la puntuación global; no dio detalles por generador ni región visual.",
        "disclaimer": (
            "Sightengine evalúa los píxeles y devuelve una puntuación de confianza. Puede haber falsos positivos y negativos; "
            "el valor no identifica por sí solo el origen ni prueba autenticidad."
        ),
        "history_notice": (
            "El historial solo guarda la hora y el resultado, nunca la imagen. "
            "Se borra al terminar la sesión."
        ),
        "empty_history": "Todavía no hay análisis en esta sesión.",
        "clear_history": "Borrar historial de sesión",
        "history_cleared": "Historial de sesión borrado.",
        "time": "Hora",
        "history_score": "Confianza Sightengine",
        "history_result": "Resultado",
        "version": "Detector de imágenes · análisis privado por sesión",
    },
}


class AnalysisError(Exception):
    """A safe, user-facing error raised while calling the analysis provider."""


def validate_image_bytes(data: bytes) -> str:
    if not data:
        raise ValueError("empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("size")

    try:
        with Image.open(BytesIO(data)) as image:
            image_format = image.format
            width, height = image.size
            if image_format not in SUPPORTED_IMAGE_FORMATS:
                raise ValueError("format")
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise ValueError("dimensions")
            image.verify()
    except ValueError:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise ValueError("invalid") from exc
    except Exception as exc:
        # Pillow plugins may raise decoding-specific exceptions that do not
        # inherit from OSError. Treat malformed uploads as invalid input.
        raise ValueError("invalid") from exc

    return SUPPORTED_IMAGE_FORMATS[image_format]


def parse_ai_generated_score(payload: Any) -> float:
    if not isinstance(payload, dict) or payload.get("status") != "success":
        raise ValueError("status")

    result_type = payload.get("type")
    score = result_type.get("ai_generated") if isinstance(result_type, dict) else None
    if (
        isinstance(score, bool)
        or not isinstance(score, (int, float))
        or not math.isfinite(score)
        or not 0 <= score <= 1
    ):
        raise ValueError("score")
    return float(score)


@dataclass(frozen=True)
class ImageAnalysis:
    score: float
    generator_scores: tuple[tuple[str, float], ...] = ()


def parse_generator_scores(payload: Any) -> tuple[tuple[str, float], ...]:
    """Return the provider's optional per-generator confidence details."""
    if not isinstance(payload, dict) or not isinstance(payload.get("type"), dict):
        return ()
    raw_scores = payload["type"].get("ai_generators")
    if not isinstance(raw_scores, dict):
        return ()

    valid_scores = [
        (str(name), float(score))
        for name, score in raw_scores.items()
        if isinstance(name, str)
        and name
        and isinstance(score, (int, float))
        and not isinstance(score, bool)
        and math.isfinite(score)
        and 0 <= score <= 1
    ]
    return tuple(sorted(valid_scores, key=lambda item: item[1], reverse=True)[:3])


def classify_score(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score <= 0.2:
        return "low"
    return "inconclusive"


def localized_analysis_error(text: dict[str, str], error_key: str) -> str:
    text_key = {
        "credentials": "provider_credentials",
        "rate_limit": "provider_rate_limit",
        "unavailable": "provider_unavailable",
    }.get(error_key, error_key)
    return text.get(text_key, text["analysis_error"])


def get_sightengine_credentials() -> tuple[str, str]:
    """Read environment/.env values first, then fall back to Streamlit secrets."""
    def read_credential(name: str) -> str:
        value = os.getenv(name, "")
        if value is not None and str(value).strip():
            return str(value).strip()

        try:
            value = st.secrets.get(name)
        except Exception:
            value = None
        return str(value or "").strip()

    return (
        read_credential("SIGHTENGINE_USER"),
        read_credential("SIGHTENGINE_SECRET"),
    )


def analyze_image(image_bytes: bytes, api_user: str, api_secret: str) -> ImageAnalysis:
    content_type = validate_image_bytes(image_bytes)
    try:
        response = requests.post(
            API_URL,
            data={
                "models": "genai",
                "api_user": api_user,
                "api_secret": api_secret,
            },
            files={"media": ("upload", image_bytes, content_type)},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.Timeout as exc:
        raise AnalysisError("timeout") from exc
    except requests.RequestException as exc:
        raise AnalysisError("network") from exc

    if response.status_code in {401, 403}:
        raise AnalysisError("credentials")
    if response.status_code == 429:
        raise AnalysisError("rate_limit")
    if response.status_code >= 500:
        raise AnalysisError("unavailable")
    if response.status_code >= 400:
        raise AnalysisError("provider")

    try:
        payload = response.json()
    except ValueError as exc:
        raise AnalysisError("invalid_response") from exc

    try:
        return ImageAnalysis(
            score=parse_ai_generated_score(payload),
            generator_scores=parse_generator_scores(payload),
        )
    except ValueError as exc:
        raise AnalysisError("invalid_response") from exc


def main() -> None:
    logo_path = Path(__file__).parent / "assets" / "ektheto-logo-dark.png"
    st.set_page_config(
        page_title="Ektheto — Deepfake detector",
        page_icon=str(logo_path) if logo_path.is_file() else "E",
        layout="wide",
    )
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        :root {
            --ekt-navy: #0a1128;
            --ekt-card: #111b3d;
            --ekt-cyan: #00d2ff;
            --ekt-blue: #3a7bd5;
            --ekt-gradient: linear-gradient(110deg, var(--ekt-cyan), var(--ekt-blue));
        }
        html, body, .stApp, [class*="css"], button, input, textarea, select {
            font-family: 'Inter', sans-serif;
        }
        html, body, .stApp, [data-testid="stAppViewContainer"],
        [data-testid="stMain"], [data-testid="stSidebar"] {
            background: var(--ekt-navy) !important;
            color: #ffffff;
        }
        #MainMenu, footer, [data-testid="stToolbar"],
        [data-testid="stDecoration"], [data-testid="stDeployButton"],
        [data-testid="stStatusWidget"] {
            display: none !important;
        }
        [data-testid="stHeader"] {
            background: rgba(10, 17, 40, 0.92) !important;
        }
        [data-testid="stMainBlockContainer"] {
            max-width: 1160px;
        }
        .block-container {
            width: min(100% - 3rem, 1160px);
            padding-top: clamp(1.5rem, 3vw, 2.75rem);
            padding-bottom: 4rem;
        }
        [data-testid="stTabs"] { margin-top: 1.5rem; }
        [data-testid="stFileUploader"] {
            margin: 0.75rem 0 1.25rem;
            padding: 1.15rem;
            border: 1px solid rgba(148, 180, 255, 0.18);
            border-radius: 14px;
            background: rgba(17, 27, 61, 0.55);
        }
        [data-testid="stImage"] { margin: 1rem 0 1.5rem; }
        [data-testid="stImage"] img { max-height: 520px; object-fit: contain; }
        [data-testid="stVerticalBlockBorderWrapper"] {
            border-color: rgba(148, 180, 255, 0.2) !important;
            border-radius: 14px !important;
            background: rgba(17, 27, 61, 0.5);
            padding: 1.15rem;
        }
        [data-testid="stMetric"] { min-height: 112px; }
        [data-testid="stMarkdownContainer"] p { line-height: 1.65; }
        [data-testid="stMarkdownContainer"], [data-testid="stMarkdownContainer"] p,
        [data-testid="stMarkdownContainer"] h1, [data-testid="stMarkdownContainer"] h2,
        [data-testid="stMarkdownContainer"] h3,
        [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] {
            color: #ffffff;
        }
        [data-testid="stFileUploaderDropzone"],
        [data-testid="stFileUploader"] section,
        [data-testid="stFileUploadDropzone"] {
            border: 1.5px dashed transparent;
            border-radius: 14px;
            background: linear-gradient(var(--ekt-card), var(--ekt-card)) padding-box,
                        var(--ekt-gradient) border-box;
            color: #ffffff;
            transition: background-color 160ms ease, transform 160ms ease;
        }
        [data-testid="stFileUploaderDropzone"]:hover,
        [data-testid="stFileUploader"] section:hover,
        [data-testid="stFileUploadDropzone"]:hover {
            background: linear-gradient(#16244d, #16244d) padding-box,
                        var(--ekt-gradient) border-box;
        }
        [data-testid="stFileUploaderDropzone"],
        [data-testid="stFileUploadDropzone"] {
            color: #ffffff;
        }
        [data-testid="stFileUploader"] small,
        [data-testid="stFileUploader"] label,
        [data-testid="stFileUploader"] button {
            color: #dbeafe !important;
        }
        div.stButton > button,
        [data-testid="stButton"] > button {
            width: 100%;
            min-height: 3rem;
            border: 0;
            border-radius: 10px;
            background: var(--ekt-gradient);
            color: #ffffff;
            font-size: 1.05rem;
            font-weight: 700;
            box-shadow: 0 8px 24px rgba(0, 160, 230, 0.2);
            transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
        }
        div.stButton > button:hover,
        [data-testid="stButton"] > button:hover {
            border: 0;
            background: var(--ekt-gradient);
            color: #ffffff;
            transform: scale(1.02);
            box-shadow: 0 12px 30px rgba(0, 160, 230, 0.32);
            filter: brightness(1.08);
        }
        div.stButton > button:focus:not(:active),
        [data-testid="stButton"] > button:focus:not(:active) {
            color: #ffffff;
            border-color: #00d2ff;
            box-shadow: 0 0 0 3px rgba(0, 210, 255, 0.25);
        }
        [data-testid="stAlert"], [data-testid="stAlertContainer"] {
            border: 1px solid rgba(148, 180, 255, 0.14);
            border-radius: 14px;
            background: var(--ekt-card) !important;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
            color: #ffffff;
        }
        [data-testid="stAlert"] [data-testid="stMarkdownContainer"] p,
        [data-testid="stAlertContainer"] [data-testid="stMarkdownContainer"] p {
            color: #ffffff !important;
        }
        [data-testid="stMetric"] {
            padding: 1rem 1.1rem;
            border: 1px solid rgba(148, 180, 255, 0.14);
            border-radius: 14px;
            background: var(--ekt-card);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
        }
        [data-testid="stTabs"] [role="tab"] {
            color: #b9c7e6;
        }
        [data-testid="stTabs"] [role="tab"][aria-selected="true"] {
            color: #ffffff;
        }
        @media (max-width: 600px) {
            .block-container {
                width: min(100% - 1.25rem, 1160px);
                padding-top: 1rem;
                padding-bottom: 2rem;
            }
            .ekt-hero {
                padding-top: 1rem;
            }
            div.stButton > button:hover,
            [data-testid="stButton"] > button:hover {
                transform: scale(1.01);
            }
        }
        .ekt-hero {
            padding: 0.5rem 0;
            text-align: left;
        }
        .ekt-hero h1 {
            margin: 0;
            color: #ffffff;
            font-size: clamp(2rem, 4vw, 2.8rem);
            font-weight: 700;
            letter-spacing: -0.045em;
        }
        .ekt-hero p {
            max-width: 760px;
            margin: 0.35rem 0 0;
            color: #c5cee0;
            font-size: 1rem;
        }
        .page-description {
            max-width: 920px;
            margin: 0.75rem 0 1.5rem;
            color: #d2d9e8;
            line-height: 1.7;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.session_state.setdefault("language", "pt")
    st.session_state.setdefault("analysis_history", [])
    st.session_state.setdefault("current_image_digest", None)
    st.session_state.setdefault("current_analysis", None)
    with st.sidebar:
        selected_language = st.selectbox(
            "Language / Idioma",
            options=tuple(LANGUAGES),
            format_func=LANGUAGES.__getitem__,
            key="language",
        )
        st.markdown("---")
        st.caption(TEXT[selected_language]["version"])

    text = TEXT[selected_language]
    brand_column, intro_column = st.columns([1, 8], vertical_alignment="center", gap="large")
    with brand_column:
        if logo_path.is_file():
            st.image(str(logo_path), width=104)
        else:
            st.markdown("## Ektheto")
    with intro_column:
        st.markdown(
            f'<div class="ekt-hero"><h1>Ektheto</h1><p>{text["tagline"]}</p></div>',
            unsafe_allow_html=True,
        )
    st.markdown(
        f'<p class="page-description">{text["description"]}</p>',
        unsafe_allow_html=True,
    )
    analysis_tab, news_tab, history_tab = st.tabs(
        [text["analysis_tab"], text["news_tab"], text["history_tab"]]
    )

    with analysis_tab:
        with st.container(border=True):
            st.subheader(text["upload_heading"])
            st.caption(text["upload_guidance"])
            uploaded_file = st.file_uploader(
                text["upload"],
                type=["jpg", "jpeg", "png", "webp", "bmp"],
                max_upload_size=10,
                key="deepfake_image_upload",
            )
            image_bytes: bytes | None = None
            if uploaded_file is not None:
                try:
                    image_bytes = uploaded_file.getvalue()
                    validate_image_bytes(image_bytes)
                    st.image(image_bytes, caption=uploaded_file.name, width=520)
                except ValueError as exc:
                    image_bytes = None
                    if str(exc) == "size":
                        st.error(text["large_image"])
                    elif str(exc) == "dimensions":
                        st.error(text["large_dimensions"])
                    else:
                        st.error(text["invalid_image"])

            image_digest = hashlib.sha256(image_bytes).hexdigest() if image_bytes else None
            if image_digest != st.session_state.current_image_digest:
                st.session_state.current_image_digest = image_digest
                st.session_state.current_analysis = None

            if st.button(
                text["analyze"],
                type="primary",
                disabled=image_bytes is None,
                use_container_width=True,
            ):
                st.session_state.current_analysis = None
                api_user, api_secret = get_sightengine_credentials()
                if not api_user or not api_secret:
                    st.error(text["missing_credentials"])
                elif image_bytes is not None:
                    try:
                        with st.spinner(text["loading"]):
                            analysis = analyze_image(image_bytes, api_user, api_secret)
                    except ValueError as exc:
                        if str(exc) == "size":
                            st.error(text["large_image"])
                        elif str(exc) == "dimensions":
                            st.error(text["large_dimensions"])
                        else:
                            st.error(text["invalid_image"])
                    except AnalysisError as exc:
                        error_key = str(exc)
                        if error_key not in {
                            "timeout",
                            "network",
                            "credentials",
                            "rate_limit",
                            "unavailable",
                            "invalid_response",
                            "provider",
                        }:
                            error_key = "analysis_error"
                        st.error(localized_analysis_error(text, error_key))
                    else:
                        score = analysis.score
                        verdict = classify_score(score)
                        st.session_state.current_analysis = {
                            "score": score,
                            "verdict": verdict,
                            "generator_scores": analysis.generator_scores,
                        }
                        st.session_state.analysis_history.insert(
                            0,
                            {
                                "time": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M"),
                                "score": score,
                                "verdict": verdict,
                            },
                        )

        current_analysis = st.session_state.current_analysis
        if current_analysis is not None:
            score = current_analysis["score"]
            verdict = current_analysis["verdict"]
            with st.container(border=True):
                st.subheader(text["result"])
                st.metric(text["score"], f"{score:.1%}")
                st.caption(text["score_help"])
                if current_analysis["generator_scores"]:
                    st.caption(text["generator_detail"])
                    generator_summary = " ? ".join(
                        f"{name.replace('_', ' ').title()}: {value:.1%}"
                        for name, value in current_analysis["generator_scores"]
                    )
                    st.write(generator_summary)
                else:
                    st.caption(text["no_generator_detail"])

                detail_key = f"{verdict}_detail"
                detail_message = text[detail_key].format(score=f"{score:.1%}")
                if verdict == "high":
                    st.warning(f'{text["high"]}. {detail_message}')
                elif verdict == "low":
                    st.info(f'{text["low"]}. {detail_message}')
                else:
                    st.warning(f'{text["inconclusive"]}. {detail_message}')
                st.caption(text["disclaimer"])

    with news_tab:
        st.warning(text["news_demo_notice"])
        demo_path = Path(__file__).parent / "assets" / "ektheto-radar.html"
        if demo_path.is_file():
            st.iframe(demo_path, height=1300, alt="EkthetoRadar — interface demonstrativa")
        else:
            st.error("The news radar demo file is missing.")

    with history_tab:
        st.caption(text["history_notice"])
        if st.session_state.analysis_history:
            history_rows = [
                {
                    text["time"]: item["time"],
                    text["history_score"]: f'{item["score"]:.1%}',
                    text["history_result"]: text[item["verdict"]],
                }
                for item in st.session_state.analysis_history
            ]
            if st.button(text["clear_history"]):
                st.session_state.analysis_history.clear()
                st.success(text["history_cleared"])
            else:
                st.dataframe(history_rows, hide_index=True, width="stretch")
        else:
            st.info(text["empty_history"])


if __name__ == "__main__":
    main()
