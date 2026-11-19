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
        "history_tab": "Histórico da sessão",
        "upload": "Seleciona uma imagem (JPEG ou PNG)",
        "analyze": "Analisar imagem",
        "missing_credentials": (
            "A análise não está configurada. Define SIGHTENGINE_USER e "
            "SIGHTENGINE_SECRET no ambiente ou no ficheiro .env."
        ),
        "invalid_image": "Não foi possível validar a imagem. Carrega um JPEG ou PNG válido.",
        "large_image": "A imagem excede o limite de 10 MB.",
        "large_dimensions": "A imagem excede o limite de resolução permitido.",
        "analysis_error": "Não foi possível concluir a análise.",
        "timeout": "A análise demorou demasiado. Tenta novamente mais tarde.",
        "network": "Não foi possível contactar o serviço de análise. Verifica a ligação e tenta novamente.",
        "provider": "O serviço não conseguiu analisar esta imagem.",
        "provider_unavailable": "O serviço de análise está temporariamente indisponível.",
        "provider_credentials": "O serviço recusou as credenciais configuradas.",
        "provider_rate_limit": "O limite de pedidos do serviço foi atingido. Tenta mais tarde.",
        "invalid_response": "O serviço devolveu uma resposta inválida.",
        "result": "Resultado da análise",
        "score": "Sinal de geração por IA",
        "high": "Sinais elevados de geração por IA",
        "high_detail": (
            "O serviço encontrou sinais compatíveis com geração por IA. "
            "Isto não prova que a imagem seja falsa."
        ),
        "low": "Poucos sinais de geração por IA",
        "low_detail": (
            "O serviço encontrou poucos sinais de geração por IA. "
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
        "history_score": "Sinal IA",
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
        "history_tab": "Session history",
        "upload": "Choose an image (JPEG or PNG)",
        "analyze": "Analyze image",
        "missing_credentials": (
            "Analysis is not configured. Set SIGHTENGINE_USER and "
            "SIGHTENGINE_SECRET in the environment or .env file."
        ),
        "invalid_image": "The image could not be validated. Upload a valid JPEG or PNG.",
        "large_image": "The image exceeds the 10 MB limit.",
        "large_dimensions": "The image exceeds the allowed resolution limit.",
        "analysis_error": "The analysis could not be completed.",
        "timeout": "The analysis took too long. Please try again later.",
        "network": "Could not reach the analysis service. Check your connection and try again.",
        "provider": "The service could not analyze this image.",
        "provider_unavailable": "The analysis service is temporarily unavailable.",
        "provider_credentials": "The service rejected the configured credentials.",
        "provider_rate_limit": "The service request limit was reached. Try again later.",
        "invalid_response": "The service returned an invalid response.",
        "result": "Analysis result",
        "score": "AI-generation signal",
        "high": "Strong AI-generation signals",
        "high_detail": (
            "The service found signals consistent with AI generation. "
            "This does not prove the image is fake."
        ),
        "low": "Few AI-generation signals",
        "low_detail": (
            "The service found few AI-generation signals. "
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
        "history_score": "AI signal",
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
        "history_tab": "Historial de sesión",
        "upload": "Selecciona una imagen (JPEG o PNG)",
        "analyze": "Analizar imagen",
        "missing_credentials": (
            "El análisis no está configurado. Define SIGHTENGINE_USER y "
            "SIGHTENGINE_SECRET en el entorno o en el archivo .env."
        ),
        "invalid_image": "No se pudo validar la imagen. Carga un JPEG o PNG válido.",
        "large_image": "La imagen supera el límite de 10 MB.",
        "large_dimensions": "La imagen supera el límite de resolución permitido.",
        "analysis_error": "No se pudo completar el análisis.",
        "timeout": "El análisis tardó demasiado. Inténtalo de nuevo más tarde.",
        "network": "No se pudo contactar con el servicio de análisis. Comprueba la conexión e inténtalo de nuevo.",
        "provider": "El servicio no pudo analizar esta imagen.",
        "provider_unavailable": "El servicio de análisis no está disponible temporalmente.",
        "provider_credentials": "El servicio rechazó las credenciales configuradas.",
        "provider_rate_limit": "Se alcanzó el límite de solicitudes. Inténtalo más tarde.",
        "invalid_response": "El servicio devolvió una respuesta no válida.",
        "result": "Resultado del análisis",
        "score": "Señal de generación por IA",
        "high": "Señales altas de generación por IA",
        "high_detail": (
            "El servicio encontró señales compatibles con generación por IA. "
            "Esto no demuestra que la imagen sea falsa."
        ),
        "low": "Pocas señales de generación por IA",
        "low_detail": (
            "El servicio encontró pocas señales de generación por IA. "
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
        "history_score": "Señal IA",
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
    st.set_page_config(
        page_title="Ektheto — Deepfake detector",
        page_icon="🛡️",
        layout="centered",
    )
    st.markdown(
        """
        <style>
        .stApp, [data-testid="stHeader"], [data-testid="stSidebar"],
        [data-testid="stAppViewContainer"] {
            background-color: #0a1128;
            color: #ffffff;
        }
        [data-testid="stMarkdownContainer"], [data-testid="stMarkdownContainer"] p,
        [data-testid="stMarkdownContainer"] h1, [data-testid="stMarkdownContainer"] h2,
        [data-testid="stMarkdownContainer"] h3,
        [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] {
            color: #ffffff;
        }
        [data-testid="stFileUploader"] section {
            color: #ffffff;
            border-color: #52617a;
            background-color: #111b35;
        }
        div.stButton > button {
            width: 100%;
            min-height: 3rem;
            border: 0;
            border-radius: 0.6rem;
            background: linear-gradient(90deg, #18a0a6, #31c6b5);
            color: #071426;
            font-size: 1.05rem;
            font-weight: 700;
        }
        div.stButton > button:hover {
            border: 0;
            background: #49d8c6;
            color: #071426;
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
            Path(__file__).parent / "public" / "assets" / "ektheto-logo-light.png"
        )
        if logo_path.is_file():
            st.image(str(logo_path), width=160)
        else:
            st.markdown("## Ektheto")
        st.caption("Deepfake image detector")
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
    analysis_tab, history_tab = st.tabs(
        [text["analysis_tab"], text["history_tab"]]
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
            api_user = os.getenv("SIGHTENGINE_USER")
            api_secret = os.getenv("SIGHTENGINE_SECRET")
            if not api_user or not api_secret:
                st.error(text["missing_credentials"])
            elif image_bytes is not None:
                try:
                    with st.spinner(text["analysis_tab"]):
                        score = analyze_image(image_bytes, api_user, api_secret)
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
