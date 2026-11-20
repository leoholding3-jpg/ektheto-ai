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
        "tagline": "Expor o que é falso. Revelar o que é real.",
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
        "how_it_works": "Como funciona",
        "step_choose": "Escolhe uma imagem",
        "step_choose_help": "Carrega um JPG, PNG, WEBP ou BMP até 10 MB.",
        "step_analyze": "Pede a análise",
        "step_analyze_help": "A imagem só é enviada ao selecionar Analisar imagem.",
        "step_result": "Lê o resultado",
        "step_result_help": "Consulta os indicadores e confirma a origem por outras fontes.",
        "image_details": "Detalhes da imagem",
        "image_dimensions": "Dimensões",
        "image_format": "Formato",
        "image_size": "Tamanho do ficheiro",
        "privacy_title": "Privacidade e segurança",
        "privacy_body": (
            "A imagem só é enviada ao Sightengine quando selecionas Analisar. "
            "A Ektheto não guarda imagens no histórico da sessão. O resultado "
            "é uma estimativa e não prova a autenticidade da imagem."
        ),
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
        "score": "Geração por IA (modelo genai)",
        "score_help": "O modelo usa 80% ou mais como sinais elevados, 20% ou menos como baixos e valores intermédios como inconclusivos. Avalia se a imagem inteira foi gerada por IA; não deteta rostos trocados.",
        "high": "Sinais elevados de geração por IA",
        "high_detail": "O modelo genai atribuiu {score} de confiança a conteúdo gerado por IA. A pontuação não prova a origem da imagem.",
        "low": "Poucos sinais de geração por IA",
        "low_detail": "O modelo genai atribuiu {score}, indicando poucos sinais de geração integral por IA. Isto não comprova que a imagem seja autêntica.",
        "inconclusive": "Sinais de geração inconclusivos",
        "inconclusive_detail": "A pontuação está no intervalo intermédio. Confirma a origem da imagem por outras fontes.",
        "generator_detail": "Correspondências por gerador (confiança do modelo):",
        "no_generator_detail": "O Sightengine não devolveu detalhe por gerador.",
        "deepfake_heading": "Manipulação facial (deepfake)",
        "deepfake_score": "Confiança de manipulação facial",
        "deepfake_score_help": "O modelo usa 80% ou mais como sinais elevados, 20% ou menos como baixos e valores intermédios como inconclusivos. Procura rostos trocados ou alterados; não deteta imagens totalmente geradas por IA.",
        "deepfake_high": "Sinais elevados de manipulação facial",
        "deepfake_high_detail": "O modelo deepfake atribuiu {score} de confiança a uma possível troca ou alteração de rosto. Confirma a imagem com outras fontes.",
        "deepfake_low": "Poucos sinais de manipulação facial",
        "deepfake_low_detail": "O modelo deepfake atribuiu {score}, indicando poucos sinais de troca ou alteração de rosto. Isto não prova que a fotografia seja autêntica.",
        "deepfake_inconclusive": "Sinais de manipulação facial inconclusivos",
        "deepfake_inconclusive_detail": "A pontuação está no intervalo intermédio. Confirma a origem da imagem por outras fontes.",
        "deepfake_unavailable": "A API não devolveu a pontuação do modelo de manipulação facial. Confirma se o modelo deepfake está ativo na tua conta Sightengine.",
        "history_deepfake_score": "Manipulação facial",
        "disclaimer": "As pontuações são estimativas dos modelos e podem conter falsos positivos ou negativos. Não provam autenticidade nem identificam, por si só, a origem da imagem.",
        "history_notice": (
            "O histórico contém apenas a hora e o resultado, nunca a imagem. "
            "É apagado quando a sessão termina."
        ),
        "empty_history": "Ainda não há análises nesta sessão.",
        "clear_history": "Limpar histórico da sessão",
        "history_cleared": "Histórico da sessão apagado.",
        "time": "Hora",
        "history_score": "Geração por IA",
        "history_result": "Resultado",
        "version": "Detector de imagens · análise privada por sessão",
    },
    "en": {
        "title": "Ektheto — Deepfake detector",
        "tagline": "Expose what is false. Reveal what is real.",
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
        "how_it_works": "How it works",
        "step_choose": "Choose an image",
        "step_choose_help": "Upload a JPG, PNG, WEBP, or BMP up to 10 MB.",
        "step_analyze": "Request an analysis",
        "step_analyze_help": "The image is sent only when you select Analyze image.",
        "step_result": "Review the result",
        "step_result_help": "Check the indicators and verify the image with other sources.",
        "image_details": "Image details",
        "image_dimensions": "Dimensions",
        "image_format": "Format",
        "image_size": "File size",
        "privacy_title": "Privacy and security",
        "privacy_body": (
            "The image is sent to Sightengine only when you select Analyze. "
            "Ektheto does not save images in session history. The result is an "
            "estimate and does not prove that an image is authentic."
        ),
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
        "score": "AI generation (genai model)",
        "score_help": "Scores of 80% or higher are high, 20% or lower are low, and intermediate values are inconclusive. This model estimates whether the entire image was AI-generated; it does not detect swapped faces.",
        "high": "Strong signs of AI generation",
        "high_detail": "The genai model assigned {score} confidence to AI-generated content. This score does not prove the image's origin.",
        "low": "Few signs of AI generation",
        "low_detail": "The genai model assigned {score}, indicating few signs of full-image AI generation. This does not prove the image is authentic.",
        "inconclusive": "Inconclusive AI-generation signals",
        "inconclusive_detail": "The score is in the intermediate range. Check the image's origin using other sources.",
        "generator_detail": "Generator matches (model confidence):",
        "no_generator_detail": "Sightengine did not return generator details.",
        "deepfake_heading": "Face manipulation (deepfake)",
        "deepfake_score": "Face-manipulation confidence",
        "deepfake_score_help": "Scores of 80% or higher are high, 20% or lower are low, and intermediate values are inconclusive. This model checks for swapped or altered faces; it does not detect fully AI-generated images.",
        "deepfake_high": "Strong signs of face manipulation",
        "deepfake_high_detail": "The deepfake model assigned {score} confidence to a possible face swap or alteration. Check the image against other sources.",
        "deepfake_low": "Few signs of face manipulation",
        "deepfake_low_detail": "The deepfake model assigned {score}, indicating few signs of a face swap or alteration. This does not prove the photograph is authentic.",
        "deepfake_inconclusive": "Inconclusive face-manipulation signals",
        "deepfake_inconclusive_detail": "The score is in the intermediate range. Check the image's origin using other sources.",
        "deepfake_unavailable": "The API did not return a face-manipulation score. Check whether the deepfake model is enabled for your Sightengine account.",
        "history_deepfake_score": "Face manipulation",
        "disclaimer": "Model scores are estimates and may contain false positives or negatives. They do not prove authenticity or identify the image's origin on their own.",
        "history_notice": (
            "History stores only the time and result, never the image. "
            "It is cleared when the session ends."
        ),
        "empty_history": "There are no analyses in this session yet.",
        "clear_history": "Clear session history",
        "history_cleared": "Session history cleared.",
        "time": "Time",
        "history_score": "AI generation",
        "history_result": "Result",
        "version": "Image detector · private session analysis",
    },
    "es": {
        "title": "Ektheto — Detector de deepfakes",
        "tagline": "Exponer lo falso. Revelar lo real.",
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
        "how_it_works": "Cómo funciona",
        "step_choose": "Elige una imagen",
        "step_choose_help": "Carga un JPG, PNG, WEBP o BMP de hasta 10 MB.",
        "step_analyze": "Solicita el análisis",
        "step_analyze_help": "La imagen solo se envía al seleccionar Analizar imagen.",
        "step_result": "Revisa el resultado",
        "step_result_help": "Consulta los indicadores y verifica la imagen con otras fuentes.",
        "image_details": "Detalles de la imagen",
        "image_dimensions": "Dimensiones",
        "image_format": "Formato",
        "image_size": "Tamaño del archivo",
        "privacy_title": "Privacidad y seguridad",
        "privacy_body": (
            "La imagen solo se envía a Sightengine cuando seleccionas Analizar. "
            "Ektheto no guarda imágenes en el historial de la sesión. El resultado "
            "es una estimación y no demuestra la autenticidad de la imagen."
        ),
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
        "score": "Generación por IA (modelo genai)",
        "score_help": "El modelo usa un 80% o más como señales altas, un 20% o menos como bajas y los valores intermedios como no concluyentes. Evalúa si toda la imagen fue generada por IA; no detecta rostros intercambiados.",
        "high": "Señales altas de generación por IA",
        "high_detail": "El modelo genai asignó {score} de confianza a contenido generado por IA. La puntuación no demuestra el origen de la imagen.",
        "low": "Pocas señales de generación por IA",
        "low_detail": "El modelo genai asignó {score}, lo que indica pocas señales de generación integral por IA. Esto no demuestra que la imagen sea auténtica.",
        "inconclusive": "Señales de generación no concluyentes",
        "inconclusive_detail": "La puntuación está en el intervalo intermedio. Comprueba el origen de la imagen con otras fuentes.",
        "generator_detail": "Coincidencias por generador (confianza del modelo):",
        "no_generator_detail": "Sightengine no devolvió detalles por generador.",
        "deepfake_heading": "Manipulación facial (deepfake)",
        "deepfake_score": "Confianza de manipulación facial",
        "deepfake_score_help": "El modelo usa un 80% o más como señales altas, un 20% o menos como bajas y los valores intermedios como no concluyentes. Busca rostros intercambiados o alterados; no detecta imágenes totalmente generadas por IA.",
        "deepfake_high": "Señales altas de manipulación facial",
        "deepfake_high_detail": "El modelo deepfake asignó {score} de confianza a un posible intercambio o alteración de rostro. Comprueba la imagen con otras fuentes.",
        "deepfake_low": "Pocas señales de manipulación facial",
        "deepfake_low_detail": "El modelo deepfake asignó {score}, lo que indica pocas señales de intercambio o alteración de rostro. Esto no demuestra que la fotografía sea auténtica.",
        "deepfake_inconclusive": "Señales de manipulación facial no concluyentes",
        "deepfake_inconclusive_detail": "La puntuación está en el intervalo intermedio. Comprueba el origen de la imagen con otras fuentes.",
        "deepfake_unavailable": "La API no devolvió la puntuación del modelo de manipulación facial. Comprueba si el modelo deepfake está activo en tu cuenta de Sightengine.",
        "history_deepfake_score": "Manipulación facial",
        "disclaimer": "Las puntuaciones son estimaciones de los modelos y pueden contener falsos positivos o negativos. Por sí solas, no demuestran autenticidad ni identifican el origen de la imagen.",
        "history_notice": (
            "El historial solo guarda la hora y el resultado, nunca la imagen. "
            "Se borra al terminar la sesión."
        ),
        "empty_history": "Todavía no hay análisis en esta sesión.",
        "clear_history": "Borrar historial de sesión",
        "history_cleared": "Historial de sesión borrado.",
        "time": "Hora",
        "history_score": "Generación por IA",
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


def parse_deepfake_score(payload: Any) -> float | None:
    """Return the optional face-manipulation score from Sightengine."""
    if not isinstance(payload, dict) or not isinstance(payload.get("type"), dict):
        return None
    score = payload["type"].get("deepfake")
    if score is None:
        return None
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
    deepfake_score: float | None = None


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
    def send_request(models: str) -> requests.Response:
        try:
            return requests.post(
                API_URL,
                data={
                    "models": models,
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

    response = send_request("genai,deepfake")
    deepfake_requested = True
    if response.status_code in {400, 403}:
        # Keep image-generation analysis available when the account cannot use
        # the optional face-manipulation model.
        response = send_request("genai")
        deepfake_requested = False

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
            deepfake_score=(
                parse_deepfake_score(payload) if deepfake_requested else None
            ),
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
            --ekt-navy: #f7f9fc;
            --ekt-card: #ffffff;
            --ekt-cyan: #1673d1;
            --ekt-blue: #0d56aa;
            --ekt-gradient: linear-gradient(110deg, var(--ekt-cyan), var(--ekt-blue));
            --ekt-ink: #172033;
            --ekt-muted: #536174;
            --ekt-border: #d7e0ec;
        }
        html, body, .stApp, [class*="css"], button, input, textarea, select {
            font-family: 'Inter', sans-serif;
        }
        html, body, .stApp, [data-testid="stAppViewContainer"],
        [data-testid="stMain"], [data-testid="stSidebar"] {
            background: var(--ekt-navy) !important;
            color: var(--ekt-ink);
        }
        #MainMenu, footer, [data-testid="stToolbar"],
        [data-testid="stDecoration"], [data-testid="stDeployButton"],
        [data-testid="stStatusWidget"] {
            display: none !important;
        }
        [data-testid="stHeader"] {
            background: rgba(247, 249, 252, 0.96) !important;
        }
        [data-testid="stMainBlockContainer"] {
            max-width: 1160px;
        }
        .block-container {
            width: min(100% - 3rem, 1160px);
            padding-top: clamp(1rem, 2vw, 1.75rem);
            padding-bottom: 4rem;
        }
        [data-testid="stTabs"] { margin-top: 1.25rem; overflow: visible; }
        [data-testid="stTabs"] [data-baseweb="tab-list"] {
            gap: clamp(0.5rem, 2vw, 1.5rem);
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scrollbar-width: thin;
            border-bottom: 1px solid var(--ekt-border);
        }
        [data-testid="stTabs"] [role="tab"] {
            flex: 0 0 auto;
            min-height: 3.25rem;
            padding-inline: clamp(0.5rem, 1.5vw, 1rem);
            color: var(--ekt-muted);
            font-weight: 600;
        }
        [data-testid="stTabs"] [role="tab"][aria-selected="true"] {
            color: var(--ekt-blue);
            border-bottom-color: var(--ekt-blue);
        }
        [data-testid="stFileUploader"] {
            margin: 0.75rem 0 1.25rem;
            padding: 1.15rem;
            border: 1px solid var(--ekt-border);
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 8px 24px rgba(22, 44, 77, 0.06);
        }
        [data-testid="stImage"] { margin: 1rem 0 1.5rem; }
        [data-testid="stImage"] img { max-height: 520px; object-fit: contain; }
        .st-key-uploaded_image_preview [data-testid="stImage"] {
            width: 100%;
        }
        .st-key-uploaded_image_preview [data-testid="stImage"] img {
            display: block;
            width: auto !important;
            max-width: 100%;
            max-height: min(65vh, 520px);
            height: auto;
            margin-inline: auto;
            object-fit: contain;
        }
        [data-testid="stVerticalBlockBorderWrapper"] {
            border-color: var(--ekt-border) !important;
            border-radius: 16px !important;
            background: #ffffff;
            padding: 1.15rem;
            box-shadow: 0 8px 24px rgba(22, 44, 77, 0.045);
        }
        [data-testid="stMetric"] { min-height: 112px; }
        [data-testid="stMarkdownContainer"] p { line-height: 1.65; }
        [data-testid="stMarkdownContainer"], [data-testid="stMarkdownContainer"] p,
        [data-testid="stMarkdownContainer"] h1, [data-testid="stMarkdownContainer"] h2,
        [data-testid="stMarkdownContainer"] h3,
        [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] {
            color: var(--ekt-ink);
        }
        [data-testid="stFileUploaderDropzone"],
        [data-testid="stFileUploader"] section,
        [data-testid="stFileUploadDropzone"] {
            border: 1.5px dashed transparent;
            border-radius: 14px;
            background: #ffffff;
            border-color: #9aa8b8;
            color: var(--ekt-ink);
            transition: background-color 160ms ease, transform 160ms ease;
        }
        [data-testid="stFileUploaderDropzone"]:hover,
        [data-testid="stFileUploader"] section:hover,
        [data-testid="stFileUploadDropzone"]:hover {
            background: #f2f7fd;
        }
        [data-testid="stFileUploaderDropzone"],
        [data-testid="stFileUploadDropzone"] {
            color: #34445a;
        }
        [data-testid="stFileUploader"] small,
        [data-testid="stFileUploader"] label,
        [data-testid="stFileUploader"] button {
            color: #34445a !important;
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
            border: 1px solid var(--ekt-border);
            border-radius: 14px;
            background: #f1f5f9 !important;
            box-shadow: 0 8px 24px rgba(22, 44, 77, 0.06);
            color: var(--ekt-ink);
        }
        [data-testid="stAlert"] [data-testid="stMarkdownContainer"] p,
        [data-testid="stAlertContainer"] [data-testid="stMarkdownContainer"] p {
            color: var(--ekt-ink) !important;
        }
        [data-testid="stMetric"] {
            padding: 1rem 1.1rem;
            border: 1px solid var(--ekt-border);
            border-radius: 14px;
            background: #ffffff;
            box-shadow: 0 8px 24px rgba(22, 44, 77, 0.06);
        }
        [data-testid="stSidebar"] { border-right: 1px solid var(--ekt-border); }
        .ekt-privacy {
            display: flex;
            align-items: flex-start;
            gap: 1.1rem;
            margin: 0.5rem 0 1.6rem;
            padding: clamp(1.1rem, 3vw, 1.7rem);
            border: 1px solid #e3eaf2;
            border-radius: 16px;
            background: #f3f6fa;
            box-shadow: 0 8px 24px rgba(22, 44, 77, 0.07);
        }
        .ekt-privacy-icon { flex: 0 0 auto; width: 2.5rem; color: #738397; }
        .ekt-privacy h3 { margin: 0 0 0.35rem; color: var(--ekt-ink); font-size: 1.25rem; }
        .ekt-privacy p { margin: 0; color: #3f4c5c; line-height: 1.55; }
        .ekt-howto {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 0.85rem;
            margin: 0.25rem 0 0.5rem;
        }
        .ekt-step {
            min-height: 8rem;
            padding: 1rem;
            border: 1px solid var(--ekt-border);
            border-radius: 14px;
            background: #ffffff;
        }
        .ekt-step-number {
            display: inline-grid;
            place-items: center;
            width: 1.8rem;
            height: 1.8rem;
            margin-bottom: 0.55rem;
            border-radius: 50%;
            background: #eaf3ff;
            color: var(--ekt-blue);
            font-weight: 700;
        }
        .ekt-step h4 { margin: 0 0 0.25rem; color: var(--ekt-ink); font-size: 1rem; }
        .ekt-step p { margin: 0; color: var(--ekt-muted); font-size: 0.92rem; line-height: 1.45; }
        .ekt-file-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 0.6rem;
            margin: -0.4rem 0 1rem;
        }
        .ekt-file-info span {
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
            padding: 0.65rem 0.8rem;
            border: 1px solid var(--ekt-border);
            border-radius: 10px;
            background: #f7f9fc;
            color: var(--ekt-muted);
            font-size: 0.9rem;
        }
        .ekt-file-info strong { color: var(--ekt-ink); font-weight: 600; }
        @media (max-width: 600px) {
            .block-container {
                width: min(100% - 1.25rem, 1160px);
                padding-top: 1rem;
                padding-bottom: 2rem;
            }
            .ekt-hero {
                padding-top: 1rem;
            }
            [data-testid="stTabs"] [data-baseweb="tab-list"] { gap: 0.15rem; }
            [data-testid="stTabs"] [role="tab"] {
                min-height: 2.9rem;
                padding-inline: 0.55rem;
                font-size: 0.92rem;
            }
            .ekt-privacy { gap: 0.8rem; }
            .ekt-privacy-icon { width: 2rem; }
            .st-key-uploaded_image_preview [data-testid="stImage"] img {
                max-height: min(55vh, 360px);
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
            color: var(--ekt-ink);
            font-size: clamp(2rem, 4vw, 2.8rem);
            font-weight: 700;
            letter-spacing: -0.045em;
        }
        .ekt-hero p {
            max-width: 760px;
            margin: 0.35rem 0 0;
            color: var(--ekt-muted);
            font-size: 1rem;
        }
        .page-description {
            max-width: 920px;
            margin: 0.75rem 0 1.5rem;
            color: var(--ekt-muted);
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
    with st.expander(text["how_it_works"], expanded=False):
        st.markdown(
            f'''<div class="ekt-howto" role="list">
                <article class="ekt-step" role="listitem"><span class="ekt-step-number">1</span><h4>{text["step_choose"]}</h4><p>{text["step_choose_help"]}</p></article>
                <article class="ekt-step" role="listitem"><span class="ekt-step-number">2</span><h4>{text["step_analyze"]}</h4><p>{text["step_analyze_help"]}</p></article>
                <article class="ekt-step" role="listitem"><span class="ekt-step-number">3</span><h4>{text["step_result"]}</h4><p>{text["step_result_help"]}</p></article>
            </div>''',
            unsafe_allow_html=True,
        )
    analysis_tab, news_tab, history_tab = st.tabs(
        [text["analysis_tab"], text["news_tab"], text["history_tab"]]
    )

    with analysis_tab:
        st.markdown(
            f'''<section class="ekt-privacy" role="note" aria-label="{text["privacy_title"]}">
                <svg class="ekt-privacy-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <path d="M24 4 41 11v11c0 11-7.2 18.2-17 22C14.2 40.2 7 33 7 22V11L24 4Z" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
                </svg>
                <div><h3>{text["privacy_title"]}</h3><p>{text["privacy_body"]}</p></div>
            </section>''',
            unsafe_allow_html=True,
        )
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
                    with st.container(key="uploaded_image_preview"):
                        st.image(image_bytes, caption=uploaded_file.name, width="stretch")
                    with Image.open(BytesIO(image_bytes)) as preview_image:
                        preview_width, preview_height = preview_image.size
                        preview_format = preview_image.format or "Imagem"
                    preview_size = (
                        f"{len(image_bytes)} B"
                        if len(image_bytes) < 1024
                        else f"{len(image_bytes) / 1024:.0f} KB"
                        if len(image_bytes) < 1024 * 1024
                        else f"{len(image_bytes) / (1024 * 1024):.2f} MB"
                    )
                    st.markdown(
                        f'''<div class="ekt-file-info" role="group" aria-label="{text["image_details"]}">
                            <span>{text["image_dimensions"]}<strong>{preview_width} \u00d7 {preview_height}</strong></span>
                            <span>{text["image_format"]}<strong>{preview_format}</strong></span>
                            <span>{text["image_size"]}<strong>{preview_size}</strong></span>
                        </div>''',
                        unsafe_allow_html=True,
                    )
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
                        deepfake_score = analysis.deepfake_score
                        deepfake_verdict = (
                            classify_score(deepfake_score)
                            if deepfake_score is not None
                            else None
                        )
                        st.session_state.current_analysis = {
                            "score": score,
                            "verdict": verdict,
                            "generator_scores": analysis.generator_scores,
                            "deepfake_score": deepfake_score,
                            "deepfake_verdict": deepfake_verdict,
                        }
                        st.session_state.analysis_history.insert(
                            0,
                            {
                                "time": datetime.now().astimezone().strftime("%Y-%m-%d %H:%M"),
                                "score": score,
                                "verdict": verdict,
                                "deepfake_score": deepfake_score,
                                "deepfake_verdict": deepfake_verdict,
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

                st.divider()
                st.markdown(f'#### {text["deepfake_heading"]}')
                deepfake_score = current_analysis.get("deepfake_score")
                deepfake_verdict = current_analysis.get("deepfake_verdict")
                if deepfake_score is None:
                    st.warning(text["deepfake_unavailable"])
                else:
                    st.metric(text["deepfake_score"], f"{deepfake_score:.1%}")
                    st.caption(text["deepfake_score_help"])
                    deepfake_detail = text[f"deepfake_{deepfake_verdict}_detail"].format(
                        score=f"{deepfake_score:.1%}"
                    )
                    if deepfake_verdict == "high":
                        st.warning(f'{text["deepfake_high"]}. {deepfake_detail}')
                    elif deepfake_verdict == "low":
                        st.info(f'{text["deepfake_low"]}. {deepfake_detail}')
                    else:
                        st.warning(
                            f'{text["deepfake_inconclusive"]}. {deepfake_detail}'
                        )
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
                    text["history_deepfake_score"]: (
                        f'{item["deepfake_score"]:.1%}'
                        if item.get("deepfake_score") is not None
                        else "—"
                    ),
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
