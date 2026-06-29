from django.test import TestCase
from rest_framework import exceptions
from rest_framework.test import APIClient, APIRequestFactory

from organizations.authentication import JWTAuthentication, make_token
from organizations.models import Organization, OrgUser


class JWTAuthenticationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.org = Organization.objects.create(name="Acme")
        self.user = OrgUser(organization=self.org, email="a@acme.com", role="owner")
        self.user.set_password("password123")
        self.user.save()

    def _authenticate(self, token):
        request = self.factory.get("/api/documents/", HTTP_AUTHORIZATION=f"Bearer {token}")
        return JWTAuthentication().authenticate(request)

    def test_valid_token_resolves_correct_org_user(self):
        token = make_token(self.user)
        user, returned = self._authenticate(token)
        self.assertEqual(user.id, self.user.id)
        self.assertEqual(user.organization_id, self.org.id)
        self.assertEqual(returned, token)

    def test_no_authorization_header_returns_none(self):
        request = self.factory.get("/api/documents/")
        self.assertIsNone(JWTAuthentication().authenticate(request))

    def test_tampered_token_rejected(self):
        token = make_token(self.user)
        tampered = token[:-3] + ("aaa" if token[-3:] != "aaa" else "bbb")
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(tampered)

    def test_unknown_subject_rejected(self):
        # A validly-signed token for a user that no longer exists is rejected.
        ghost = OrgUser(organization=self.org, email="ghost@acme.com")
        ghost.id = "00000000-0000-0000-0000-000000000000"
        token = make_token(ghost)
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(token)

    def test_token_signed_with_other_secret_rejected(self):
        import jwt
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)
        forged = jwt.encode(
            {"sub": str(self.user.id), "iat": now, "exp": now + timedelta(hours=1)},
            "a-different-secret",
            algorithm="HS256",
        )
        with self.assertRaises(exceptions.AuthenticationFailed):
            self._authenticate(forged)

    def test_check_password(self):
        self.assertTrue(self.user.check_password("password123"))
        self.assertFalse(self.user.check_password("wrong"))


class AuthEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_org_owner_and_returns_token(self):
        resp = self.client.post(
            "/api/auth/register/",
            {"email": "Owner@Acme.com", "password": "password123", "name": "Owner", "organization_name": "Acme"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertIn("token", resp.data)
        self.assertEqual(resp.data["user"]["role"], "owner")
        self.assertEqual(resp.data["user"]["organization_name"], "Acme")
        # Email normalized to lowercase; password stored hashed (not plaintext).
        user = OrgUser.objects.get(email="owner@acme.com")
        self.assertNotEqual(user.password, "password123")
        self.assertTrue(user.check_password("password123"))

    def test_register_rejects_short_password(self):
        resp = self.client.post(
            "/api/auth/register/",
            {"email": "x@y.com", "password": "short", "organization_name": "Y"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_register_rejects_duplicate_email(self):
        org = Organization.objects.create(name="A")
        u = OrgUser(organization=org, email="dup@a.com")
        u.set_password("password123")
        u.save()
        resp = self.client.post(
            "/api/auth/register/",
            {"email": "dup@a.com", "password": "password123", "organization_name": "B"},
            format="json",
        )
        self.assertEqual(resp.status_code, 409)

    def test_login_success_and_failure(self):
        org = Organization.objects.create(name="Acme")
        u = OrgUser(organization=org, email="user@acme.com", role="owner")
        u.set_password("password123")
        u.save()

        ok = self.client.post("/api/auth/login/", {"email": "user@acme.com", "password": "password123"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertIn("token", ok.data)

        bad = self.client.post("/api/auth/login/", {"email": "user@acme.com", "password": "nope"}, format="json")
        self.assertEqual(bad.status_code, 401)

        missing = self.client.post("/api/auth/login/", {"email": "nobody@acme.com", "password": "x"}, format="json")
        self.assertEqual(missing.status_code, 401)

    def test_me_requires_auth_and_returns_profile(self):
        org = Organization.objects.create(name="Acme")
        u = OrgUser(organization=org, email="me@acme.com", role="owner")
        u.set_password("password123")
        u.save()

        self.assertEqual(self.client.get("/api/me/").status_code, 401)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_token(u)}")
        resp = self.client.get("/api/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["email"], "me@acme.com")
        self.assertEqual(resp.data["organization_name"], "Acme")
