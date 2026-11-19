"""Capture a full-page screenshot of the local Ektheto Streamlit app."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


PROJECT_ROOT = Path(__file__).resolve().parent
APP_URL = os.getenv("EKTHETO_APP_URL", "http://localhost:8501")
SCREENSHOT_PATH = PROJECT_ROOT / "assets" / "ektheto-app-screenshot.png"


def main() -> None:
    SCREENSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        with urlopen(f"{APP_URL.rstrip('/')}/_stcore/health", timeout=5) as response:
            if response.status != 200:
                raise RuntimeError(f"Streamlit health check returned HTTP {response.status}")
    except (OSError, URLError) as exc:
        raise SystemExit(
            f"Ektheto is not responding at {APP_URL}. Start it first with "
            "'streamlit run app.py'."
        ) from exc

    launch_options: dict[str, object] = {"headless": True}
    executable_path = os.getenv("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
    if executable_path:
        launch_options["executable_path"] = executable_path

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**launch_options)
        page = browser.new_page(
            viewport={"width": 1440, "height": 1100},
            device_scale_factor=1,
        )
        page.goto(APP_URL, wait_until="domcontentloaded", timeout=30_000)
        try:
            page.locator('[data-testid="stFileUploader"]').wait_for(
                state="visible", timeout=60_000
            )
        except PlaywrightTimeoutError as exc:
            browser.close()
            raise SystemExit("Streamlit loaded, but its app content did not become visible.") from exc
        dismiss_notice = page.get_by_role("button", name="Don't show again")
        if dismiss_notice.count():
            dismiss_notice.click()
        page.screenshot(path=str(SCREENSHOT_PATH), full_page=True, animations="disabled")
        browser.close()

    print(f"Screenshot saved: {SCREENSHOT_PATH.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
