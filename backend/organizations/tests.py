import datetime
from unittest import mock

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import TestCase, override_settings
from rest_framework import exceptions
from rest_framework.test import APIRequestFactory

from organizations import authentication as auth_mod
from organizations.authentication import ClerkJWTAuthentication
from organizations.models import Organization, OrgUser

ISSUER = "https://clerk.test.example.com"


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


@override_settings(CLERK_SECRET_KEY="sk_test_x", CLERK_JWT_ISSUER=ISSUER, CLERK_JWT_AUDIENCE="")
class ClerkJWTAuthenticationTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.public_pem = cls.private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        cls.private_pem = cls.private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name="Acme")
        self.user = OrgUser.objects.create(
            clerk_user_id="user_123", organization=self.org, email="a@acme.com", role="owner"
        )
        # Bypass the network JWKS fetch: hand the verifier our test public key.
        signing_key = mock.Mock(key=self.public_pem)
        patcher = mock.patch.object(auth_mod, "_signing_key", return_value=signing_key)
        self.mock_signing_key = patcher.start()
        self.addCleanup(patcher.stop)

    def _token(self, *, sub="user_123", issuer=ISSUER, audience=None, exp_delta=300, extra=None):
        payload = {
            "sub": sub,
            "iss": issuer,
            "iat": _now(),
            "exp": _now() + datetime.timedelta(seconds=exp_delta),
        }
        if audience is not None:
            payload["aud"] = audience
        if extra:
            payload.update(extra)
        return jwt.encode(payload, self.private_pem, algorithm="RS256", headers={"kid": "test"})

    def _authenticate(self, token):
        request = self.factory.get("/api/documents/", HTTP_AUTHORIZATION=f"Bearer {token}")
        return ClerkJWTAuthentication().authenticate(request)

    # --- positive direction -------------------------------------------------

    def test_valid_token_resolves_correct_org_user(self):
        token = self._token()
        user, returned_token = self._authenticate(token)
        self.assertEqual(user.id, self.user.id)
        self.assertEqual(user.organization_id, self.org.id)
        self.assertEqual(returned_token, token)  # token echoed back as auth credential

    def test_no_authorization_header_returns_none(self):
        request = self.factory.get("/api/documents/")
        self.assertIsNone(ClerkJWTAuthentication().authenticate(request))

    # --- negative direction -------------------------------------------------

    def test_expired_token_rejected(self):
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(self._token(exp_delta=-3600))

    def test_wrong_issuer_rejected(self):
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(self._token(issuer="https://evil.example.com"))

    def test_tampered_token_rejected(self):
        token = self._token()
        tampered = token[:-3] + ("aaa" if token[-3:] != "aaa" else "bbb")
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(tampered)

    def test_unknown_subject_rejected(self):
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(self._token(sub="user_does_not_exist"))

    def test_token_without_exp_rejected(self):
        # exp is required; a token minted without it must not authenticate.
        payload = {"sub": "user_123", "iss": ISSUER, "iat": _now()}
        token = jwt.encode(payload, self.private_pem, algorithm="RS256", headers={"kid": "test"})
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(token)

    @override_settings(CLERK_SECRET_KEY="", CLERK_JWT_ISSUER="")
    def test_unconfigured_clerk_rejects(self):
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(self._token())

    @override_settings(CLERK_JWT_AUDIENCE="complianceai-api")
    def test_wrong_audience_rejected_when_configured(self):
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(self._token(audience="some-other-api"))

    @override_settings(CLERK_JWT_AUDIENCE="complianceai-api")
    def test_correct_audience_accepted_when_configured(self):
        user, _ = self._authenticate(self._token(audience="complianceai-api"))
        self.assertEqual(user.id, self.user.id)
