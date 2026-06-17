from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet, GeneratedDocumentViewSet

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")
router.register("generated-documents", GeneratedDocumentViewSet, basename="generated-document")

urlpatterns = router.urls
