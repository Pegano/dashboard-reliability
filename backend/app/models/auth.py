import datetime
import enum
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(enum.Enum):
    admin = "admin"
    viewer = "viewer"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)  # used in URLs
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Power BI credentials (TODO: encrypt with Fernet)
    pbi_tenant_id = Column(String, nullable=True)
    pbi_client_id = Column(String, nullable=True)
    pbi_client_secret = Column(String, nullable=True)
    monitored_workspace_ids = Column(JSON, nullable=True)  # list of workspace IDs

    users = relationship("TenantUser", back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tenants = relationship("TenantUser", back_populates="user")
    auth_tokens = relationship("AuthToken", back_populates="user")


class TenantUser(Base):
    __tablename__ = "tenant_users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.viewer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")
    user = relationship("User", back_populates="tenants")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, nullable=False, unique=True)  # UUID sent in magic link
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="auth_tokens")

    @property
    def is_valid(self) -> bool:
        return self.used_at is None and self.expires_at > datetime.datetime.utcnow()


class TenantInvite(Base):
    __tablename__ = "tenant_invites"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    email = Column(String, nullable=False)
    token = Column(String, nullable=False, unique=True)
    role = Column(Enum(UserRole), default=UserRole.viewer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    @property
    def is_valid(self) -> bool:
        return self.accepted_at is None and self.expires_at > datetime.datetime.utcnow()
