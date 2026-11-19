# Ektheto 🛡️

![Captura da aplicação Ektheto](assets/ektheto-app-screenshot.png)

> **Verificação clara. Evidência pública.**

O **Ektheto** é uma aplicação Streamlit para analisar imagens e identificar sinais associados a conteúdo gerado por inteligência artificial. A interface valida o formato, o tamanho e as dimensões do ficheiro antes de enviar a imagem para a API do Sightengine. O resultado é apresentado como um indicador automatizado, acompanhado de um aviso de que não constitui prova de autenticidade.

## Executar localmente

```powershell
python -m pip install -r requirements.txt
python -m playwright install chromium
streamlit run app.py
```

Configure `SIGHTENGINE_USER` e `SIGHTENGINE_SECRET` no ficheiro `.env`, na raiz do projeto. Mantenha esse ficheiro fora do Git.

## Atualizar a captura

Com a aplicação aberta em `http://localhost:8501`, execute:

```powershell
python capturar.py
```

O script usa Playwright para guardar uma captura de página inteira em `assets/ektheto-app-screenshot.png`. Para definir outro endereço, use a variável `EKTHETO_APP_URL`.
