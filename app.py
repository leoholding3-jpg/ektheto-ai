import os

import requests
import streamlit as st
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError


API_URL = "https://api.sightengine.com/1.0/check.json"
REQUEST_TIMEOUT = 60

load_dotenv()

st.set_page_config(
    page_title="Ektheto | Detetor de Deepfakes",
    page_icon="🛡️",
    layout="centered",
)

st.markdown(
    """
    <style>
    .stApp,
    [data-testid="stHeader"],
    [data-testid="stSidebar"],
    [data-testid="stAppViewContainer"] {
        background-color: #0a1128;
        color: #ffffff;
    }

    [data-testid="stMarkdownContainer"],
    [data-testid="stMarkdownContainer"] p,
    [data-testid="stMarkdownContainer"] h1,
    [data-testid="stMarkdownContainer"] h2,
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

with st.sidebar:
    st.markdown("## Ektheto")
    st.caption("Versão 1.0 (Protótipo)")
    st.write("Desenvolvido por Leopoldino Alfredo")
    st.markdown("---")
    st.write(
        "Usamos inteligência artificial para ajudar a identificar imagens "
        "potencialmente falsas e proteger contra deepfakes."
    )

st.markdown(
    """
    <div class="ekt-hero">
        <h1>EKTHETO</h1>
        <p>Expor o que é falso. Revelar o que é real.</p>
    </div>
    """,
    unsafe_allow_html=True,
)
st.write(
    "Carrega uma imagem para verificar se apresenta sinais de ter sido "
    "gerada por inteligência artificial."
)

uploaded_file = st.file_uploader(
    "Seleciona uma imagem",
    type=["jpg", "jpeg", "png"],
)

image = None
if uploaded_file is not None:
    try:
        image = Image.open(uploaded_file)
        image.verify()
        uploaded_file.seek(0)
        image = Image.open(uploaded_file)
        st.image(image, caption="Imagem selecionada", use_container_width=True)
    except (UnidentifiedImageError, OSError):
        st.error("Não foi possível abrir esta imagem. Tenta carregar outro ficheiro.")

if st.button("Analisar Imagem", type="primary", disabled=image is None):
    api_user = os.getenv("SIGHTENGINE_USER")
    api_secret = os.getenv("SIGHTENGINE_SECRET")

    if not api_user or not api_secret:
        st.error(
            "As credenciais da Sightengine não estão configuradas. "
            "Adiciona SIGHTENGINE_USER e SIGHTENGINE_SECRET ao ficheiro .env."
        )
    else:
        try:
            with st.spinner("A analisar com Inteligência Artificial..."):
                # Send the image as multipart form-data and keep credentials server-side.
                files = {"media": uploaded_file.getvalue()}
                response = requests.post(
                    API_URL,
                    data={
                        "models": "genai",
                        "api_user": api_user,
                        "api_secret": api_secret,
                    },
                    files=files,
                    timeout=REQUEST_TIMEOUT,
                )
                response.raise_for_status()
                result = response.json()

            if not isinstance(result, dict) or result.get("status") != "success":
                raise ValueError("A API não devolveu uma análise bem-sucedida.")

            score = result["type"]["ai_generated"]
            # Sightengine confidence is expected as a decimal between 0 and 1.
            if (
                isinstance(score, bool)
                or not isinstance(score, (int, float))
                or not 0 <= score <= 1
            ):
                raise ValueError("A API devolveu um score inválido.")
        except (
            requests.RequestException,
            ValueError,
            KeyError,
            TypeError,
        ):
            st.error("Erro ao comunicar com o servidor de análise.")
        else:
            score_percent = score * 100
            st.subheader("Resultado da análise")
            st.metric("Trust Score", f"{score_percent:.2f}%")

            if score > 0.7:
                st.error("⚠️ ALTA PROBABILIDADE DE SER IA (Deepfake)")
                st.write(
                    "A imagem apresenta fortes sinais de ter sido gerada ou "
                    "manipulada por inteligência artificial."
                )
            elif score < 0.3:
                st.success("✅ PROVAVELMENTE REAL")
                st.write(
                    "Não foram encontrados sinais fortes de geração por "
                    "inteligência artificial. Isto não garante, por si só, "
                    "que a imagem seja autêntica."
                )
            else:
                st.warning("⚠️ INCONCLUSIVO")
                st.write(
                    "A imagem apresenta sinais mistos. Considera o resultado "
                    "inconclusivo e confirma a origem por outras fontes."
                )
