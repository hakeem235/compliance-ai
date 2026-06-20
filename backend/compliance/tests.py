from django.test import SimpleTestCase, TestCase

from organizations.models import Organization

from .crypto import decrypt_secret, encrypt_secret
from .models import OrgEmailConfig


class SecretCryptoTests(SimpleTestCase):
    def test_round_trip(self):
        token = encrypt_secret("hunter2")
        self.assertNotEqual(token, "hunter2")  # stored ciphertext is not plaintext
        self.assertEqual(decrypt_secret(token), "hunter2")

    def test_empty_values(self):
        self.assertEqual(encrypt_secret(""), "")
        self.assertEqual(decrypt_secret(""), "")

    def test_corrupted_token_returns_empty(self):
        self.assertEqual(decrypt_secret("not-a-valid-token"), "")


class OrgEmailConfigTests(TestCase):
    def test_password_is_encrypted_and_recoverable(self):
        org = Organization.objects.create(name="Acme")
        config = OrgEmailConfig.objects.create(
            organization=org, host="smtp.example.com", from_email="noreply@example.com"
        )
        config.set_password("s3cret")
        config.save()

        self.assertTrue(config.has_password)
        self.assertNotIn("s3cret", config.password_encrypted)
        self.assertEqual(config.get_password(), "s3cret")
