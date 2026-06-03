import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    contexts = relationship("UserContext", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # negative for expenses, positive for income
    category = Column(String, nullable=False, index=True)
    status = Column(String, default="posted")  # "posted" or "pending"
    receipt_image = Column(String, nullable=True)  # File path of receipt
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    limit_amount = Column(Float, nullable=False)
    period = Column(String, default="monthly")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="budgets")
    
    __table_args__ = (
        UniqueConstraint("user_id", "category", name="uq_user_category_budget"),
    )

class UserContext(Base):
    __tablename__ = "user_contexts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    context_key = Column(String, nullable=False)  # e.g., "payday", "exclude_rent_food"
    context_value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="contexts")
    
    __table_args__ = (
        UniqueConstraint("user_id", "context_key", name="uq_user_context_key"),
    )

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    merchant = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # absolute positive amount
    frequency = Column(String, default="monthly")
    last_charged_date = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="subscriptions")
    
    __table_args__ = (
        UniqueConstraint("user_id", "merchant", name="uq_user_merchant_sub"),
    )

# Indexes for querying speed
Index("idx_transactions_user_date", Transaction.user_id, Transaction.date)
