import os
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import requests
from PIL import Image
from app import (
    AnalysisError,
    analyze_image,
    classify_score,
    get_sightengine_credentials,
    localized_analysis_error,
    parse_ai_generated_score,
    validate_image_bytes,
    TEXT,
)

from streamlit.testing.v1 import AppTest


# Streamlit creates this directory at import time. Python 3.14's global
# TemporaryDirectory finalizer tries to chmod it during interpreter shutdown,
# which is denied by the Windows sandbox. It contains only AppTest scratch
# files, so detach that shutdown finalizer; the OS reclaims it with the temp
# directory lifecycle.
_app_test_module = __import__("streamlit.testing.v1.app_test", fromlist=["TMP_DIR"])
_app_test_module.TMP_DIR._finalizer.detach()


def make_image(image_format: str = "PNG", size: tuple[int, int] = (10, 10)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color=(20, 40, 60)).save(output, format=image_format)
    return output.getvalue()


class TestImageValidation(unittest.TestCase):
    def test_accepts_jpeg_and_png(self) -> None:
        self.assertEqual(validate_image_bytes(make_image("JPEG")), "image/jpeg")
        self.assertEqual(validate_image_bytes(make_image("PNG")), "image/png")

    def test_rejects_empty_and_corrupt_files(self) -> None:
        for data in (b"", b"not an image"):
            with self.subTest(data=data), self.assertRaises(ValueError):
                validate_image_bytes(data)

    def test_rejects_unsupported_format(self) -> None:
        with self.assertRaisesRegex(ValueError, "format"):
            validate_image_bytes(make_image("GIF"))

    def test_rejects_oversized_file(self) -> None:
        data = make_image()
        with patch("app.MAX_IMAGE_BYTES", len(data) - 1):
            with self.assertRaisesRegex(ValueError, "size"):
                validate_image_bytes(data)

    def test_rejects_image_over_pixel_limit(self) -> None:
        image = MagicMock()
        image.__enter__.return_value = image
        image.format = "PNG"
        image.size = (5001, 5000)
        with patch("app.Image.open", return_value=image):
            with self.assertRaisesRegex(ValueError, "dimensions"):
                validate_image_bytes(b"valid-looking-image")

    def test_accepts_all_supported_image_formats(self) -> None:
        expected = {
            "JPEG": "image/jpeg",
            "PNG": "image/png",
            "WEBP": "image/webp",
            "BMP": "image/bmp",
        }
        for image_format, mime_type in expected.items():
            with self.subTest(image_format=image_format):
                self.assertEqual(validate_image_bytes(make_image(image_format)), mime_type)

    def test_rejects_images_just_over_byte_limit(self) -> None:
        data = make_image("PNG")
        with patch("app.MAX_IMAGE_BYTES", len(data) - 1):
            with self.assertRaisesRegex(ValueError, "size"):
                validate_image_bytes(data)

    def test_accepts_image_at_exact_byte_limit(self) -> None:
        data = make_image("WEBP")
        with patch("app.MAX_IMAGE_BYTES", len(data)):
            self.assertEqual(validate_image_bytes(data), "image/webp")

    def test_rejects_zero_or_negative_dimensions(self) -> None:
        image = MagicMock()
        image.__enter__.return_value = image
        image.format = "PNG"
        image.size = (0, 10)
        with patch("app.Image.open", return_value=image):
            with self.assertRaisesRegex(ValueError, "dimensions"):
                validate_image_bytes(b"valid-looking-image")


class TestScoreGrid(unittest.TestCase):
    pass


def make_score_test(score: float):
    def test_score_is_accepted(self: TestScoreGrid) -> None:
        payload = {"status": "success", "type": {"ai_generated": score}}
        self.assertEqual(parse_ai_generated_score(payload), score)

    return test_score_is_accepted


for percentage in range(101):
    setattr(
        TestScoreGrid,
        f"test_valid_score_at_{percentage:03d}_percent",
        make_score_test(percentage / 100),
    )


class TestScoreValidation(unittest.TestCase):
    def test_rejects_invalid_payload_shapes_and_scores(self) -> None:
        invalid_payloads = [
            None,
            [],
            {},
            {"status": "failure", "type": {"ai_generated": 0.5}},
            {"status": "success", "type": None},
            {"status": "success", "type": {"ai_generated": True}},
            {"status": "success", "type": {"ai_generated": False}},
            {"status": "success", "type": {"ai_generated": -0.01}},
            {"status": "success", "type": {"ai_generated": 1.01}},
            {"status": "success", "type": {"ai_generated": float("nan")}},
            {"status": "success", "type": {"ai_generated": float("inf")}},
            {"status": "success", "type": {"ai_generated": "0.5"}},
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                parse_ai_generated_score(payload)

    def test_classifies_threshold_boundaries(self) -> None:
        cases = {
            0.0: "low",
            0.2999: "low",
            0.3: "inconclusive",
            0.7: "inconclusive",
            0.7001: "high",
            1.0: "high",
        }
        for score, expected in cases.items():
            with self.subTest(score=score):
                self.assertEqual(classify_score(score), expected)

    def test_score_classification_is_consistent_across_full_range(self) -> None:
        for step in range(101):
            score = step / 100
            expected = "low" if score < 0.3 else "high" if score > 0.7 else "inconclusive"
            with self.subTest(score=score):
                self.assertEqual(classify_score(score), expected)


class TestLocalizedAnalysisErrors(unittest.TestCase):
    def test_all_provider_errors_have_specific_messages_in_every_language(self) -> None:
        error_keys = (
            "timeout",
            "network",
            "credentials",
            "rate_limit",
            "unavailable",
            "provider",
            "invalid_response",
        )
        for language, text in TEXT.items():
            for error_key in error_keys:
                with self.subTest(language=language, error_key=error_key):
                    message = localized_analysis_error(text, error_key)
                    self.assertNotEqual(message, text["analysis_error"])


class TestSightengineCredentials(unittest.TestCase):
    def test_prefers_streamlit_cloud_secrets_and_trims_whitespace(self) -> None:
        with patch(
            "app.st.secrets",
            {
                "SIGHTENGINE_USER": " cloud-user ",
                "SIGHTENGINE_SECRET": " cloud-secret ",
            },
        ), patch(
            "app.os.getenv",
            side_effect=lambda name, default="": f"local-{name}",
        ):
            self.assertEqual(
                get_sightengine_credentials(),
                ("cloud-user", "cloud-secret"),
            )

    def test_uses_local_environment_when_a_cloud_secret_is_missing(self) -> None:
        with patch("app.st.secrets", {"SIGHTENGINE_USER": "cloud-user"}), patch(
            "app.os.getenv",
            side_effect=lambda name, default="": {
                "SIGHTENGINE_USER": "local-user",
                "SIGHTENGINE_SECRET": " local-secret ",
            }.get(name, default),
        ):
            self.assertEqual(
                get_sightengine_credentials(),
                ("cloud-user", "local-secret"),
            )


class TestSightengineRequest(unittest.TestCase):
    def setUp(self) -> None:
        self.image = make_image()

    def test_posts_image_and_keeps_credentials_server_side(self) -> None:
        response = MagicMock(status_code=200)
        response.json.return_value = {
            "status": "success",
            "type": {"ai_generated": 0.42},
        }
        with patch("app.requests.post", return_value=response) as post:
            score = analyze_image(self.image, "test-user", "test-secret")

        self.assertEqual(score, 0.42)
        kwargs = post.call_args.kwargs
        self.assertEqual(kwargs["data"]["api_user"], "test-user")
        self.assertEqual(kwargs["data"]["api_secret"], "test-secret")
        self.assertEqual(kwargs["files"]["media"][2], "image/png")
        self.assertEqual(kwargs["timeout"], 30)

    def test_maps_provider_status_codes_to_safe_errors(self) -> None:
        cases = {
            400: "provider",
            401: "credentials",
            403: "credentials",
            429: "rate_limit",
            500: "unavailable",
        }
        for status_code, expected in cases.items():
            response = MagicMock(status_code=status_code)
            with self.subTest(status_code=status_code), patch(
                "app.requests.post", return_value=response
            ), self.assertRaisesRegex(AnalysisError, expected):
                analyze_image(self.image, "test-user", "test-secret")

    def test_maps_timeout_and_connection_errors(self) -> None:
        for error, expected in (
            (requests.Timeout(), "timeout"),
            (requests.ConnectionError(), "network"),
        ):
            with self.subTest(error=type(error).__name__), patch(
                "app.requests.post", side_effect=error
            ), self.assertRaisesRegex(AnalysisError, expected):
                analyze_image(self.image, "test-user", "test-secret")

    def test_rejects_invalid_provider_json_and_scores(self) -> None:
        invalid_responses = [
            MagicMock(status_code=200, **{"json.return_value": []}),
            MagicMock(status_code=200, **{"json.return_value": {"status": "success"}}),
            MagicMock(status_code=200, **{"json.side_effect": ValueError("invalid JSON")}),
        ]
        for response in invalid_responses:
            with self.subTest(response=response), patch(
                "app.requests.post", return_value=response
            ), self.assertRaisesRegex(AnalysisError, "invalid_response"):
                analyze_image(self.image, "test-user", "test-secret")

    def test_does_not_send_invalid_image_to_provider(self) -> None:
        with patch("app.requests.post") as post:
            with self.assertRaises(ValueError):
                analyze_image(b"invalid", "test-user", "test-secret")
        post.assert_not_called()

    def test_sends_correct_content_type_for_each_supported_format(self) -> None:
        response = MagicMock(status_code=200)
        response.json.return_value = {"status": "success", "type": {"ai_generated": 0.5}}
        for image_format, mime_type in (
            ("JPEG", "image/jpeg"),
            ("PNG", "image/png"),
            ("WEBP", "image/webp"),
            ("BMP", "image/bmp"),
        ):
            with self.subTest(image_format=image_format), patch(
                "app.requests.post", return_value=response
            ) as post:
                analyze_image(make_image(image_format), "test-user", "test-secret")
                self.assertEqual(post.call_args.kwargs["files"]["media"][2], mime_type)

    def test_maps_all_http_error_classes(self) -> None:
        for status_code, expected in (
            (400, "provider"),
            (404, "provider"),
            (401, "credentials"),
            (403, "credentials"),
            (429, "rate_limit"),
            (500, "unavailable"),
            (503, "unavailable"),
        ):
            response = MagicMock(status_code=status_code)
            with self.subTest(status_code=status_code), patch(
                "app.requests.post", return_value=response
            ), self.assertRaisesRegex(AnalysisError, expected):
                analyze_image(self.image, "test-user", "test-secret")

    def test_missing_or_malformed_provider_score_is_rejected(self) -> None:
        payloads = (
            {"status": "success", "type": {"ai_generated": None}},
            {"status": "success", "type": {"ai_generated": "0.2"}},
            {"status": "success", "type": {"ai_generated": 1.5}},
            {"status": "error", "type": {"ai_generated": 0.5}},
        )
        for payload in payloads:
            response = MagicMock(status_code=200)
            response.json.return_value = payload
            with self.subTest(payload=payload), patch(
                "app.requests.post", return_value=response
            ), self.assertRaisesRegex(AnalysisError, "invalid_response"):
                analyze_image(self.image, "test-user", "test-secret")


class TestStreamlitInterface(unittest.TestCase):
    app_path = Path(__file__).parents[1] / "app.py"

    def test_app_starts_with_analysis_news_and_history_tabs(self) -> None:
        app_test = AppTest.from_file(str(self.app_path)).run()
        self.assertEqual(len(app_test.exception), 0)
        self.assertEqual(
            [tab.label for tab in app_test.tabs],
            [
                "Analisar imagem",
                "Radar Ektheto 3D",
                "Histórico da sessão",
            ],
        )
        self.assertTrue(app_test.button[0].disabled)

    def test_news_radar_is_loaded_and_labeled_as_a_simulation(self) -> None:
        app_test = AppTest.from_file(str(self.app_path)).run()
        self.assertEqual(len(app_test.exception), 0)
        self.assertTrue(
            any(
                "simulados por regras de texto" in warning.value
                for warning in app_test.warning
            )
        )
        self.assertEqual(len(app_test.tabs), 3)

    def test_premium_styles_are_injected_into_the_rendered_app(self) -> None:
        app_test = AppTest.from_file(str(self.app_path)).run()
        injected_styles = "\n".join(
            str(getattr(element, "value", "")) for element in app_test.markdown
        )
        for expected_style in (
            "--ekt-background: #101418",
            "--ekt-accent",
            "[data-testid=\"stButton\"] > button",
            "[data-testid=\"stFileUploadDropzone\"]",
            "[data-testid=\"stAlert\"]",
            "font-family: 'Inter', sans-serif",
        ):
            with self.subTest(expected_style=expected_style):
                self.assertIn(expected_style, injected_styles)

    def test_radar_ui_uses_name_and_restricted_visual_system(self) -> None:
        radar_html = (self.app_path.parent / "assets" / "radar-ektheto-3d.html").read_text(
            encoding="utf-8"
        )
        self.assertIn("<title>Radar Ektheto 3D</title>", radar_html)
        self.assertIn("font-family: Inter, system-ui, sans-serif", radar_html)
        self.assertNotIn("linear-gradient", radar_html)
        self.assertNotIn("radial-gradient", radar_html)
        self.assertNotIn("box-shadow", radar_html)
        self.assertNotIn("Space Grotesk", radar_html)
        self.assertNotIn("FatoRadar", radar_html)
        self.assertIn("controls.enableZoom = true", radar_html)

    def test_ui_copy_avoids_ai_branding(self) -> None:
        visible_copy = " ".join(
            value
            for language in TEXT.values()
            for value in language.values()
            if isinstance(value, str)
        )
        self.assertNotIn(" por IA", visible_copy)
        self.assertNotIn("AI ", visible_copy)
        self.assertNotIn("Sinal IA", visible_copy)

    def test_uploader_advertises_all_requested_extensions(self) -> None:
        app_test = AppTest.from_file(str(self.app_path)).run()
        self.assertEqual(len(app_test.exception), 0)
        uploader = app_test.file_uploader[0]
        self.assertEqual(
            uploader.proto.type,
            [".jpg", ".jpeg", ".png", ".webp", ".bmp"],
        )

    def test_each_supported_image_can_be_uploaded(self) -> None:
        for image_format, extension, mime_type in (
            ("JPEG", "jpg", "image/jpeg"),
            ("PNG", "png", "image/png"),
            ("WEBP", "webp", "image/webp"),
            ("BMP", "bmp", "image/bmp"),
        ):
            with self.subTest(image_format=image_format):
                app_test = AppTest.from_file(str(self.app_path)).run()
                app_test.file_uploader[0].upload(
                    f"test.{extension}", make_image(image_format), mime_type
                ).run()
                self.assertIsNotNone(app_test.file_uploader[0].value)
                self.assertFalse(app_test.button[0].disabled)
                self.assertEqual(len(app_test.exception), 0)

    def test_language_preference_updates_interface(self) -> None:
        app_test = AppTest.from_file(str(self.app_path)).run()
        app_test.selectbox[0].select("es").run()
        self.assertEqual(app_test.session_state["language"], "es")
        self.assertEqual(app_test.tabs[0].label, "Analizar imagen")
        self.assertEqual(len(app_test.exception), 0)

    def test_language_change_keeps_selected_image(self) -> None:
        app_test = AppTest.from_file(str(self.app_path)).run()
        app_test.file_uploader[0].upload(
            "test.png",
            make_image(),
            "image/png",
        ).run()
        app_test.selectbox[0].select("en").run()
        self.assertIsNotNone(app_test.file_uploader[0].value)
        self.assertEqual(len(app_test.exception), 0)

    def test_analysis_is_recorded_and_clearable_without_saving_image(self) -> None:
        response = MagicMock(status_code=200)
        response.json.return_value = {
            "status": "success",
            "type": {"ai_generated": 0.42},
        }
        real_getenv = os.getenv

        def fake_getenv(name: str, default: str | None = None) -> str | None:
            if name in {"SIGHTENGINE_USER", "SIGHTENGINE_SECRET"}:
                return "test-credential"
            return real_getenv(name, default)

        with patch("os.getenv", side_effect=fake_getenv), patch(
            "requests.post", return_value=response
        ) as post:
            app_test = AppTest.from_file(str(self.app_path)).run()
            app_test.file_uploader[0].upload(
                "test.png",
                make_image(),
                "image/png",
            ).run()
            next(
                button
                for button in app_test.button
                if button.label == "Analisar imagem"
            ).click().run()

            history = app_test.session_state["analysis_history"]
            self.assertEqual(len(history), 1)
            self.assertEqual(history[0]["score"], 0.42)
            self.assertNotIn("image", history[0])
            self.assertEqual(len(app_test.get("dataframe")), 1)
            post.assert_called_once()

            next(
                button
                for button in app_test.button
                if button.label == "Limpar histórico da sessão"
            ).click().run()
            self.assertEqual(app_test.session_state["analysis_history"], [])
            self.assertEqual(len(app_test.success), 1)

    def test_missing_credentials_never_calls_provider(self) -> None:
        real_getenv = os.getenv

        def fake_getenv(name: str, default: str | None = None) -> str | None:
            if name in {"SIGHTENGINE_USER", "SIGHTENGINE_SECRET"}:
                return ""
            return real_getenv(name, default)

        with patch("os.getenv", side_effect=fake_getenv), patch(
            "requests.post"
        ) as post:
            app_test = AppTest.from_file(str(self.app_path)).run()
            app_test.file_uploader[0].upload(
                "test.png",
                make_image(),
                "image/png",
            ).run()
            next(
                button
                for button in app_test.button
                if button.label == "Analisar imagem"
            ).click().run()

        self.assertEqual(len(app_test.error), 1)
        self.assertIn("não está configurada", app_test.error[0].value)
        post.assert_not_called()

    def test_provider_rate_limit_shows_specific_message(self) -> None:
        real_getenv = os.getenv

        def fake_getenv(name: str, default: str | None = None) -> str | None:
            if name in {"SIGHTENGINE_USER", "SIGHTENGINE_SECRET"}:
                return "test-credential"
            return real_getenv(name, default)

        response = MagicMock(status_code=429)
        with patch("os.getenv", side_effect=fake_getenv), patch(
            "requests.post", return_value=response
        ):
            app_test = AppTest.from_file(str(self.app_path)).run()
            app_test.file_uploader[0].upload(
                "test.png",
                make_image(),
                "image/png",
            ).run()
            next(
                button
                for button in app_test.button
                if button.label == "Analisar imagem"
            ).click().run()

        self.assertEqual(len(app_test.error), 1)
        self.assertIn("limite de pedidos", app_test.error[0].value)


if __name__ == "__main__":
    unittest.main()
