"""
Seed script to populate initial mock data in the sqlite database.
Run with: python seed_data.py
"""

import asyncio
from datetime import datetime, timezone, timedelta
from app.core.database import AsyncSessionLocal, create_tables
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.all_models import (
    Customer, Menu, Inventory, Employee, Supplier,
    Order, OrderItem, Review, FoodWaste,
    FoodCategory, OrderStatus, PaymentStatus
)

async def seed_database():
    print("[INFO] Initializing database schema...")
    await create_tables()

    async with AsyncSessionLocal() as session:
        # Check if user exists
        admin_user = await session.execute(
            User.__table__.select().where(User.email == "admin@restaurant.com")
        )
        if admin_user.first() is not None:
            print("[INFO] Database already contains seed data.")
            return

        print("[INFO] Seeding default users...")
        hashed_pwd = get_password_hash("Admin@123")
        admin = User(
            full_name="Admin Chef",
            email="admin@restaurant.com",
            hashed_password=hashed_pwd,
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True
        )
        manager = User(
            full_name="Bistro Manager",
            email="manager@restaurant.com",
            hashed_password=hashed_pwd,
            role=UserRole.MANAGER,
            is_active=True,
            is_verified=True
        )
        varsha = User(
            full_name="Varsha K M",
            email="varshakm@gmail.com",
            hashed_password=hashed_pwd,
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True
        )
        session.add_all([admin, manager, varsha])
        await session.flush()

        print("[INFO] Seeding suppliers...")
        sup1 = Supplier(name="Fresh Farms Organic", contact_person="John Doe", phone="+91 98765 43210", email="john@freshfarms.com", category="Vegetables & Dairy")
        sup2 = Supplier(name="Prime Meats Ltd", contact_person="Sarah Smith", phone="+91 98765 12345", email="sarah@primemeats.com", category="Poultry & Meat")
        session.add_all([sup1, sup2])
        await session.flush()

        print("[INFO] Seeding inventory...")
        inv1 = Inventory(ingredient_name="Basmati Rice", category="Grains", quantity=45.0, unit="kg", unit_cost=90.0, reorder_level=15.0, max_stock=100.0, supplier_id=sup1.id)
        inv2 = Inventory(ingredient_name="Chicken Breast", category="Meat", quantity=12.0, unit="kg", unit_cost=250.0, reorder_level=20.0, max_stock=60.0, supplier_id=sup2.id)
        inv3 = Inventory(ingredient_name="Paneer (Cottage Cheese)", category="Dairy", quantity=8.0, unit="kg", unit_cost=320.0, reorder_level=10.0, max_stock=30.0, supplier_id=sup1.id)
        session.add_all([inv1, inv2, inv3])
        await session.flush()

        print("[INFO] Seeding menu...")
        m1 = Menu(name="Butter Chicken", description="Tender chicken cooked in rich tomato butter gravy", category=FoodCategory.MAIN_COURSE, price=380.0, cost_price=160.0, total_orders=145, rating=4.8)
        m2 = Menu(name="Paneer Tikka", description="Char-grilled spiced cottage cheese cubes with mint chutney", category=FoodCategory.APPETIZER, price=290.0, cost_price=110.0, total_orders=98, rating=4.6)
        m3 = Menu(name="Gulab Jamun", description="Soft milk-solid dumplings soaked in cardamom sugar syrup", category=FoodCategory.DESSERT, price=140.0, cost_price=40.0, total_orders=210, rating=4.9)
        session.add_all([m1, m2, m3])
        await session.flush()

        print("[INFO] Seeding customers...")
        c1 = Customer(name="Aarav Sharma", email="aarav@example.com", phone="+91 99887 76655", total_orders=12, total_spent=4200.0, segment="VIP High Value")
        c2 = Customer(name="Priya Patel", email="priya@example.com", phone="+91 98877 66554", total_orders=5, total_spent=1450.0, segment="Regular Loyalist")
        session.add_all([c1, c2])
        await session.flush()

        print("[INFO] Seeding employees...")
        e1 = Employee(name="Chef Rajesh Kumar", email="rajesh@restaurant.com", phone="+91 91234 56789", position="Head Chef", department="Kitchen", salary=55000.0)
        e2 = Employee(name="Anita Verma", email="anita@restaurant.com", phone="+91 92345 67890", position="Floor Supervisor", department="Service", salary=35000.0)
        session.add_all([e1, e2])

        print("[INFO] Seeding orders...")
        o1 = Order(customer_id=c1.id, status=OrderStatus.READY, payment_status=PaymentStatus.PAID, total_amount=670.0, table_number="T4")
        session.add(o1)
        await session.flush()

        item1 = OrderItem(order_id=o1.id, menu_item_id=m1.id, quantity=1, unit_price=380.0, total_price=380.0)
        item2 = OrderItem(order_id=o1.id, menu_item_id=m2.id, quantity=1, unit_price=290.0, total_price=290.0)
        session.add_all([item1, item2])

        print("[INFO] Seeding reviews...")
        r1 = Review(customer_id=c1.id, order_id=o1.id, rating=5, comment="Exceptional butter chicken! Rich flavor and fast service.", sentiment="positive", sentiment_score=0.95, is_verified=True)
        session.add(r1)

        print("[INFO] Seeding food waste...")
        w1 = FoodWaste(inventory_id=inv2.id, ingredient_name="Chicken Breast", quantity_wasted=2.5, unit="kg", reason="Expired / Spoiled", cost=625.0)
        session.add(w1)

        await session.commit()
        print("[SUCCESS] Database seeded successfully with initial data!")

if __name__ == "__main__":
    asyncio.run(seed_database())
