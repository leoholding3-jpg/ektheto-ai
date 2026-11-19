from __future__ import annotations

import os
import math
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

import truststore

truststore.inject_into_ssl()

import requests
import streamlit as st
import streamlit.components.v1 as components
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
        "title": "Ektheto — Análise de imagem",
        "image_section": "Análise de imagens",
        "tagline": "Analisa imagens para identificar sinais de conteúdo sintético.",
        "description": (
            "Carrega uma imagem e consulta o Sightengine. O ficheiro só é enviado "
            "quando selecionas Analisar; não guardamos a imagem nem o histórico "
            "fora desta sessão."
        ),
        "language": "Idioma",
        "analysis_tab": "Analisar imagem",
        "news_tab": "Radar Ektheto 3D",
        "news_demo_notice": (
            "Demonstração local. Os resultados são simulados por regras de texto; "
            "não consultam fontes externas."
        ),
        "demo_missing_file": (
            "Não foi possível abrir o Radar Ektheto 3D. Confirma o ficheiro da interface."
        ),
        "history_tab": "Histórico da sessão",
        "upload": "Seleciona uma imagem (JPG, PNG, WEBP ou BMP)",
        "analyze": "Analisar imagem",
        "loading": "A analisar imagem",
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
        "score": "Sinal de conteúdo sintético",
        "high": "Sinais fortes de conteúdo sintético",
        "high_detail": (
            "O serviço encontrou sinais compatíveis com conteúdo sintético. "
            "Isto não prova que a imagem seja falsa."
        ),
        "low": "Poucos sinais de conteúdo sintético",
        "low_detail": (
            "O serviço encontrou poucos sinais de conteúdo sintético. "
            "Isto não garante que a imagem seja autêntica."
        ),
        "inconclusive": "Resultado inconclusivo",
        "inconclusive_detail": (
            "Os sinais são mistos. Confirma a origem da imagem por outras fontes."
        ),
        "disclaimer": (
            "Este resultado é uma indicação automatizada, não uma prova de autenticidade. "
            "A análise é processada pelo Sightengine."
        ),
        "history_notice": (
            "O histórico contém apenas a hora e o resultado, nunca a imagem. "
            "É apagado quando a sessão termina."
        ),
        "empty_history": "Ainda não há análises nesta sessão.",
        "clear_history": "Limpar histórico da sessão",
        "history_cleared": "Histórico da sessão apagado.",
        "time": "Hora",
        "history_score": "Sinal sintético",
        "history_result": "Resultado",
        "version": "Detector de imagens · análise privada por sessão",
    },
    "en": {
        "title": "Ektheto — Image analysis",
        "image_section": "Image analysis",
        "tagline": "Checks images for signs of synthetic content.",
        "description": (
            "Upload an image and check it with Sightengine. The file is sent only "
            "when you select Analyze; neither the image nor history is stored beyond "
            "this session."
        ),
        "language": "Language",
        "analysis_tab": "Analyze image",
        "news_tab": "Radar Ektheto 3D",
        "news_demo_notice": (
            "Local demonstration. Results are simulated from text rules; "
            "no external sources are queried."
        ),
        "demo_missing_file": "Could not load Radar Ektheto 3D. Check the interface file.",
        "history_tab": "Session history",
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
        "score": "Synthetic-content signal",
        "high": "Strong synthetic-content signals",
        "high_detail": (
            "The service found signals consistent with synthetic content. "
            "This does not prove the image is fake."
        ),
        "low": "Few synthetic-content signals",
        "low_detail": (
            "The service found few synthetic-content signals. "
            "This does not guarantee the image is authentic."
        ),
        "inconclusive": "Inconclusive result",
        "inconclusive_detail": (
            "The signals are mixed. Check the image's origin using other sources."
        ),
        "disclaimer": (
            "This is an automated indicator, not proof of authenticity. "
            "Analysis is processed by Sightengine."
        ),
        "history_notice": (
            "History stores only the time and result, never the image. "
            "It is cleared when the session ends."
        ),
        "empty_history": "There are no analyses in this session yet.",
        "clear_history": "Clear session history",
        "history_cleared": "Session history cleared.",
        "time": "Time",
        "history_score": "Synthetic signal",
        "history_result": "Result",
        "version": "Image detector · private session analysis",
    },
    "es": {
        "title": "Ektheto — Análisis de imágenes",
        "image_section": "Análisis de imágenes",
        "tagline": "Analiza imágenes para detectar señales de contenido sintético.",
        "description": (
            "Carga una imagen y consulta Sightengine. El archivo solo se envía "
            "al seleccionar Analizar; ni la imagen ni el historial se guardan "
            "fuera de esta sesión."
        ),
        "language": "Idioma",
        "analysis_tab": "Analizar imagen",
        "news_tab": "Radar Ektheto 3D",
        "news_demo_notice": (
            "Demostración local. Los resultados se simulan mediante reglas de texto; "
            "no se consultan fuentes externas."
        ),
        "demo_missing_file": (
            "No se pudo abrir Radar Ektheto 3D. Comprueba el archivo de la interfaz."
        ),
        "history_tab": "Historial de sesión",
        "upload": "Selecciona una imagen (JPG, PNG, WEBP o BMP)",
        "analyze": "Analizar imagen",
        "loading": "Analizando imagen",
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
        "score": "Señal de contenido sintético",
        "high": "Señales altas de contenido sintético",
        "high_detail": (
            "El servicio encontró señales compatibles con contenido sintético. "
            "Esto no demuestra que la imagen sea falsa."
        ),
        "low": "Pocas señales de contenido sintético",
        "low_detail": (
            "El servicio encontró pocas señales de contenido sintético. "
            "Esto no garantiza que la imagen sea auténtica."
        ),
        "inconclusive": "Resultado no concluyente",
        "inconclusive_detail": (
            "Las señales son mixtas. Comprueba el origen de la imagen con otras fuentes."
        ),
        "disclaimer": (
            "Este resultado es un indicador automático, no una prueba de autenticidad. "
            "El análisis lo procesa Sightengine."
        ),
        "history_notice": (
            "El historial solo guarda la hora y el resultado, nunca la imagen. "
            "Se borra al terminar la sesión."
        ),
        "empty_history": "Todavía no hay análisis en esta sesión.",
        "clear_history": "Borrar historial de sesión",
        "history_cleared": "Historial de sesión borrado.",
        "time": "Hora",
        "history_score": "Señal sintética",
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


def classify_score(score: float) -> str:
    if score > 0.7:
        return "high"
    if score < 0.3:
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


def analyze_image(image_bytes: bytes, api_user: str, api_secret: str) -> float:
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
        return parse_ai_generated_score(payload)
    except ValueError as exc:
        raise AnalysisError("invalid_response") from exc


def main() -> None:
    app_icon = Path(__file__).parent / "assets" / "ektheto-logo-dark.png"
    st.set_page_config(
        page_title="Ektheto — Análise de imagem",
        page_icon=str(app_icon),
        layout="centered",
    )
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
            --ekt-background: #101418;
            --ekt-surface: #1a2026;
            --ekt-border: #36404a;
            --ekt-accent: #8295a5;
            --ekt-text: #e8edf1;
            --ekt-muted: #a2adb7;
        }
        html, body, .stApp, [class*="css"], button, input, textarea, select {
            font-family: 'Inter', sans-serif;
        }
        html, body, .stApp, [data-testid="stAppViewContainer"],
        [data-testid="stMain"], [data-testid="stSidebar"] {
            background: var(--ekt-background) !important;
            color: var(--ekt-text);
        }
        #MainMenu, footer, [data-testid="stToolbar"],
        [data-testid="stDecoration"], [data-testid="stDeployButton"],
        [data-testid="stStatusWidget"] {
            display: none !important;
        }
        [data-testid="stHeader"] {
            background: var(--ekt-background) !important;
        }
        [data-testid="stMainBlockContainer"] {
            max-width: 780px;
        }
        .block-container {
            width: min(100% - 2rem, 780px);
            padding-top: clamp(1.25rem, 4vw, 2.75rem);
            padding-bottom: 3rem;
        }
        [data-testid="stMarkdownContainer"], [data-testid="stMarkdownContainer"] p,
        [data-testid="stMarkdownContainer"] h1, [data-testid="stMarkdownContainer"] h2,
        [data-testid="stMarkdownContainer"] h3,
        [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] {
            color: var(--ekt-text);
        }
        [data-testid="stFileUploaderDropzone"],
        [data-testid="stFileUploader"] section,
        [data-testid="stFileUploadDropzone"] {
            border: 1px dashed var(--ekt-border);
            border-radius: 8px;
            background: var(--ekt-surface);
            color: var(--ekt-text);
            transition: border-color 100ms ease;
        }
        [data-testid="stFileUploaderDropzone"]:hover,
        [data-testid="stFileUploader"] section:hover,
        [data-testid="stFileUploadDropzone"]:hover {
            border-color: var(--ekt-accent);
        }
        [data-testid="stFileUploaderDropzone"],
        [data-testid="stFileUploadDropzone"] {
            color: var(--ekt-text);
        }
        [data-testid="stFileUploader"] small,
        [data-testid="stFileUploader"] label,
        [data-testid="stFileUploader"] button {
            color: var(--ekt-muted) !important;
        }
        div.stButton > button,
        [data-testid="stButton"] > button {
            width: 100%;
            min-height: 3rem;
            border: 1px solid var(--ekt-accent);
            border-radius: 8px;
            background: var(--ekt-accent);
            color: #101418;
            font-size: 0.95rem;
            font-weight: 600;
            transition: background-color 100ms ease;
        }
        div.stButton > button:hover,
        [data-testid="stButton"] > button:hover {
            border-color: var(--ekt-accent);
            background: #a7b7c4;
            color: #101418;
        }
        div.stButton > button:focus:not(:active),
        [data-testid="stButton"] > button:focus:not(:active) {
            color: #101418;
            outline: 2px solid var(--ekt-accent);
            outline-offset: 2px;
        }
        [data-testid="stAlert"], [data-testid="stAlertContainer"] {
            border: 1px solid var(--ekt-border);
            border-radius: 8px;
            background: var(--ekt-surface) !important;
            color: var(--ekt-text);
        }
        [data-testid="stAlert"] [data-testid="stMarkdownContainer"] p,
        [data-testid="stAlertContainer"] [data-testid="stMarkdownContainer"] p {
            color: var(--ekt-text) !important;
        }
        [data-testid="stMetric"] {
            padding: 1rem 1.1rem;
            border: 1px solid var(--ekt-border);
            border-radius: 8px;
            background: var(--ekt-surface);
        }
        .ekt-loading {
            margin: 1rem 0;
            padding: 1rem;
            border: 1px solid var(--ekt-border);
            border-radius: 8px;
            background: var(--ekt-surface);
        }
        .ekt-loading-label {
            margin: 0 0 0.85rem;
            color: var(--ekt-muted);
            font-size: 0.85rem;
        }
        .ekt-skeleton-line {
            height: 0.7rem;
            margin-top: 0.55rem;
            border-radius: 3px;
            background: #303840;
            animation: ekt-pulse 1.2s ease-in-out infinite alternate;
        }
        .ekt-skeleton-line.short { width: 46%; }
        .ekt-skeleton-line.medium { width: 72%; }
        @keyframes ekt-pulse {
            from { opacity: 0.52; }
            to { opacity: 0.88; }
        }
        @media (prefers-reduced-motion: reduce) {
            .ekt-skeleton-line { animation: none; }
        }
        [data-testid="stTabs"] [role="tab"] {
            color: var(--ekt-muted);
        }
        [data-testid="stTabs"] [role="tab"][aria-selected="true"] {
            color: var(--ekt-text);
        }
        @media (max-width: 600px) {
            .block-container {
                width: min(100% - 1.25rem, 780px);
                padding-top: 1rem;
                padding-bottom: 2rem;
            }
            .ekt-hero {
                padding-top: 1rem;
            }
        }
        .ekt-hero {
            padding: 1.5rem 0 1rem;
            text-align: center;
        }
        .ekt-hero h1 {
            margin: 0;
            color: #ffffff;
            font-size: clamp(2.8rem, 10vw, 4.5rem);
            font-weight: 800;
            letter-spacing: 0.16em;
        }
        .ekt-hero p {
            margin-top: 0.4rem;
            color: #c5cee0;
            font-size: 1.1rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.session_state.setdefault("language", "pt")
    st.session_state.setdefault("analysis_history", [])
    with st.sidebar:
        logo_path = (
            Path(__file__).parent / "assets" / "ektheto-logo-dark.png"
        )
        if logo_path.is_file():
            st.image(str(logo_path), width=160)
        else:
            st.markdown("## Ektheto")
        st.caption(
            TEXT.get(st.session_state["language"], TEXT["pt"])["image_section"]
        )
        selected_language = st.selectbox(
            "Language / Idioma",
            options=tuple(LANGUAGES),
            format_func=LANGUAGES.__getitem__,
            key="language",
        )
        st.markdown("---")
        st.caption(TEXT[selected_language]["version"])

    text = TEXT[selected_language]
    st.markdown(
        f"""
        <div class="ekt-hero">
            <h1>Ektheto</h1>
            <p>{text["tagline"]}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.write(text["description"])
    analysis_tab, news_tab, history_tab = st.tabs(
        [text["analysis_tab"], text["news_tab"], text["history_tab"]]
    )

    with analysis_tab:
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
                st.image(image_bytes, caption=text["upload"], width="stretch")
            except ValueError as exc:
                image_bytes = None
                if str(exc) == "size":
                    st.error(text["large_image"])
                elif str(exc) == "dimensions":
                    st.error(text["large_dimensions"])
                else:
                    st.error(text["invalid_image"])

        if st.button(
            text["analyze"],
            type="primary",
            disabled=image_bytes is None,
        ):
            api_user, api_secret = get_sightengine_credentials()
            if not api_user or not api_secret:
                st.error(text["missing_credentials"])
            elif image_bytes is not None:
                try:
                    loading = st.empty()
                    with loading.container():
                        st.markdown(
                            f"""
                            <div class="ekt-loading" role="status" aria-live="polite">
                                <p class="ekt-loading-label">{text["loading"]}</p>
                                <div class="ekt-skeleton-line medium"></div>
                                <div class="ekt-skeleton-line"></div>
                                <div class="ekt-skeleton-line short"></div>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    try:
                        score = analyze_image(image_bytes, api_user, api_secret)
                    finally:
                        loading.empty()
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
                    verdict = classify_score(score)
                    st.session_state.analysis_history.insert(
                        0,
                        {
                            "time": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M"),
                            "score": score,
                            "verdict": verdict,
                        },
                    )
                    st.subheader(text["result"])
                    st.metric(text["score"], f"{score:.1%}")
                    if verdict == "high":
                        st.error(f'{text["high"]}. {text["high_detail"]}')
                    elif verdict == "low":
                        st.success(f'{text["low"]}. {text["low_detail"]}')
                    else:
                        st.warning(f'{text["inconclusive"]}. {text["inconclusive_detail"]}')
                    st.caption(text["disclaimer"])

    with news_tab:
        st.warning(text["news_demo_notice"])
        demo_path = Path(__file__).parent / "assets" / "radar-ektheto-3d.html"
        if demo_path.is_file():
            components.html(
                demo_path.read_text(encoding="utf-8"),
                height=1120,
                scrolling=True,
            )
        else:
            st.error(text["demo_missing_file"])

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
