"""Customer, Order, Menu, Inventory, Employee, Supplier, Review, Payment, Report, AI Log models — placeholders."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, Numeric, Enum, JSON
from sqlalchemy.orm import synonym, relationship
from datetime import datetime, timezone
from app.core.database import Base
import enum


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Numeric(12, 2), default=0)
    segment = Column(String(50), nullable=True)
    loyalty_points = Column(Integer, default=0)
    preferences = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class OrderType(str, enum.Enum):
    DINE_IN = "dine_in"
    TAKEAWAY = "takeaway"
    DELIVERY = "delivery"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    total_amount = Column(Numeric(12, 2), default=0)
    discount = Column(Numeric(8, 2), default=0)
    tax = Column(Numeric(8, 2), default=0)
    notes = Column(Text, nullable=True)
    table_number = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")

    @property
    def order_type(self) -> OrderType:
        return OrderType.DINE_IN if self.table_number else OrderType.TAKEAWAY

    @property
    def user_id(self) -> int:
        return 1

    @property
    def discount_amount(self) -> float:
        return float(self.discount) if self.discount is not None else 0.0

    @property
    def tax_amount(self) -> float:
        return float(self.tax) if self.tax is not None else 0.0

    @property
    def subtotal(self) -> float:
        tot = float(self.total_amount) if self.total_amount is not None else 0.0
        tx = float(self.tax) if self.tax is not None else 0.0
        return round(tot - tx, 2)


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    notes = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    order = relationship("Order", back_populates="items")
    menu_item = relationship("Menu", lazy="selectin")

    @property
    def price_at_time(self) -> float:
        return float(self.unit_price) if self.unit_price is not None else 0.0


class FoodCategory(str, enum.Enum):
    APPETIZER = "appetizer"
    MAIN_COURSE = "main_course"
    DESSERT = "dessert"
    BEVERAGE = "beverage"
    SNACK = "snack"
    COMBO = "combo"
    SPECIAL = "special"


class Menu(Base):
    __tablename__ = "menu"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(FoodCategory), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2), nullable=True)
    image_url = Column(String(500), nullable=True)
    is_available = Column(Boolean, default=True)
    is_vegetarian = Column(Boolean, default=False)
    calories = Column(Integer, nullable=True)
    preparation_time = Column(Integer, nullable=True)  # in minutes
    total_orders = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RecipeItem(Base):
    __tablename__ = "recipe_items"
    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu.id"), nullable=False)
    inventory_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    quantity_required = Column(Float, nullable=False)  # amount to deduct per order
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    ingredient_name = Column(String(200), nullable=False)
    item_name = synonym("ingredient_name")
    category = Column(String(100), nullable=True)
    quantity = Column(Float, default=0)
    unit = Column(String(30), nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=True)
    unit_price = synonym("unit_cost")
    reorder_level = Column(Float, default=0)
    max_stock = Column(Float, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    last_restocked = Column(DateTime(timezone=True), nullable=True)
    location = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    phone = Column(String(20), nullable=True)
    position = Column(String(100), nullable=False)
    role = synonym("position")
    department = Column(String(100), nullable=True)
    salary = Column(Numeric(12, 2), nullable=True)
    shift = Column(String(50), nullable=True)
    hire_date = Column(DateTime(timezone=True), nullable=True)
    join_date = synonym("hire_date")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    items_supplied = Column(Text, nullable=True)
    payment_terms = Column(String(200), nullable=True)
    delivery_schedule = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    sentiment = Column(String(20), nullable=True)  # positive, negative, neutral
    sentiment_score = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    method = Column(String(50), nullable=False)  # cash, card, upi, etc.
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_id = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    report_type = Column(String(50), nullable=False)  # daily, weekly, monthly, yearly
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    content = Column(JSON, nullable=True)
    file_path = Column(String(500), nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AILog(Base):
    __tablename__ = "ai_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    context_retrieved = Column(JSON, nullable=True)
    model_used = Column(String(100), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FoodWaste(Base):
    __tablename__ = "food_waste"
    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id"), nullable=True)
    ingredient_name = Column(String(200), nullable=False)
    quantity_wasted = Column(Float, nullable=False)
    unit = Column(String(30), nullable=False)
    reason = Column(String(200), nullable=True)  # expired, overcooked, unsold, etc.
    cost = Column(Numeric(10, 2), nullable=True)
    waste_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

from app.models.setting import Setting
