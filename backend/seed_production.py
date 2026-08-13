"""
Production Database Seed Script for RestaurantAI
-------------------------------------------------
Inserts realistic Indian restaurant data into the database.
Safe to run: will DROP and recreate all tables for a clean slate.

Records inserted:
  - 1   Admin user (email: admin@restaurant.com / password: Admin@123)
  - 85  Suppliers
  - 160 Inventory items (with 8 LOW STOCK items for dashboard alerts)
  - 125 Menu items (authentic Indian dishes)
  - Recipe links (menu item → ingredient mappings)
  - 105 Employees
  - 210 Customers
  - 550 Orders + OrderItems (past 30 days, backdated)
  - 310 Reviews
  - 155 Food Waste logs
"""

import asyncio
import random
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import Base, engine, AsyncSessionLocal
from app.models.all_models import (
    Customer, Order, OrderItem, OrderStatus, PaymentStatus,
    Menu, FoodCategory, RecipeItem, Inventory, Employee, Supplier,
    Review, Payment, FoodWaste
)
from app.models.user import User, UserRole
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("seed")

try:
    from faker import Faker
    fake = Faker("en_IN")  # Indian locale for realistic names/addresses
    fake.unique.clear()
except ImportError:
    raise SystemExit("❌  Please install faker:  pip install faker")

# ──────────────────────────────────────────────
#  MENU DATA  (authentic Indian restaurant items)
# ──────────────────────────────────────────────
FOOD_TEMPLATES = {
    FoodCategory.APPETIZER: [
        ("Crispy Garlic Bread", False, 149),
        ("Paneer Tikka Bites", True, 259),
        ("Vegetable Spring Rolls", True, 189),
        ("Chilli Mushroom", True, 229),
        ("Loaded Potato Skins", True, 199),
        ("Chicken Wings (Spicy)", False, 319),
        ("Fish Amritsari", False, 349),
        ("Samosa Chaat", True, 149),
        ("Dynamite Shrimp", False, 389),
        ("Stuffed Mushrooms", True, 219),
        ("Onion Rings", True, 159),
        ("Chicken Seekh Kebab", False, 299),
        ("Hara Bhara Kebab", True, 239),
        ("Corn Cheese Balls", True, 189),
        ("Veg Kurkuri Momo", True, 179),
        ("Bruschetta Tomato Basil", True, 169),
        ("Hummus with Pita", True, 199),
    ],
    FoodCategory.MAIN_COURSE: [
        ("Butter Chicken with Naan", False, 380),
        ("Paneer Butter Masala", True, 340),
        ("Dal Makhani", True, 280),
        ("Paneer Lababdar", True, 360),
        ("Chicken Tikka Masala", False, 400),
        ("Tandoori Chicken Platter", False, 450),
        ("Kadhai Vegetables", True, 300),
        ("Veg Biryani", True, 320),
        ("Chicken Dum Biryani", False, 400),
        ("Mutton Rogan Josh", False, 550),
        ("Margherita Pizza", True, 380),
        ("Farmhouse Veg Pizza", True, 420),
        ("Pepperoni Pizza", False, 480),
        ("Truffle Mushroom Pasta", True, 450),
        ("Arrabbiata Penne Pasta", True, 380),
        ("Alfredo Chicken Pasta", False, 420),
        ("Classic Veg Burger", True, 259),
        ("Crispy Chicken Burger", False, 299),
        ("Grilled Salmon", False, 650),
        ("Thai Green Curry Veg", True, 360),
        ("Hakka Noodles (Veg)", True, 280),
        ("Manchurian Gravy (Veg)", True, 300),
        ("Schezwan Fried Rice Chicken", False, 340),
        ("Malai Kofta", True, 340),
        ("Bhindi Do Pyaza", True, 260),
    ],
    FoodCategory.DESSERT: [
        ("Sizzling Chocolate Brownie", True, 249),
        ("New York Cheesecake", True, 280),
        ("Warm Apple Pie", True, 229),
        ("Gulab Jamun with Ice Cream", True, 189),
        ("Rasmalai", True, 179),
        ("Chocolate Lava Cake", True, 269),
        ("Tiramisu Cup", True, 259),
        ("Mango Panna Cotta", True, 219),
        ("Moong Dal Halwa", True, 199),
        ("Red Velvet Pastry", True, 229),
        ("Blueberry Muffin", True, 149),
        ("Fudge Sundae", True, 189),
    ],
    FoodCategory.BEVERAGE: [
        ("Fresh Mint Virgin Mojito", True, 180),
        ("Iced Peach Tea", True, 160),
        ("Cold Brew Coffee", True, 220),
        ("Cappuccino", True, 190),
        ("Cafe Latte", True, 200),
        ("Oreo Chocolate Shake", True, 250),
        ("Fresh Watermelon Juice", True, 160),
        ("Mango Lassi", True, 180),
        ("Masala Chai", True, 80),
        ("Diet Cola", True, 90),
        ("Hot Chocolate", True, 210),
        ("Lemon Mint Cooler", True, 150),
        ("Strawberry Smoothie", True, 230),
        ("Cold Coffee with Ice Cream", True, 240),
    ],
    FoodCategory.SNACK: [
        ("Masala Papad", True, 79),
        ("Peanut Masala", True, 99),
        ("Veg Cutlets", True, 149),
        ("Cheese Garlic Toast", True, 159),
        ("Chicken Popcorn", False, 199),
        ("Nachos with Salsa", True, 189),
        ("Club Sandwich (Veg)", True, 199),
        ("Grilled Chicken Sandwich", False, 229),
        ("French Fries", True, 149),
        ("Vada Pav", True, 79),
        ("Pav Bhaji", True, 149),
    ],
    FoodCategory.COMBO: [
        ("Biryani & Raita Combo", False, 420),
        ("Burger Fries & Drink Combo", False, 349),
        ("Pizza & Beer Combo", False, 599),
        ("North Indian Deluxe Thali", True, 499),
        ("South Indian Combo Platter", True, 399),
        ("Pasta & Salad Meal", True, 449),
        ("Chinese Veg Executive Lunchbox", True, 349),
        ("Tikka Roll & Shake Combo", False, 349),
    ],
    FoodCategory.SPECIAL: [
        ("Chef's Signature Tandoori Platter", False, 899),
        ("Gold Leaf Biryani", False, 1299),
        ("Slow-Cooked Pork Ribs", False, 850),
        ("Avocado Toast with Poached Egg", True, 399),
        ("Quinoa Salad Bowl", True, 349),
        ("Pan-Seared Sea Bass", False, 950),
        ("Wagyu Beef Burger", False, 1150),
        ("Black Truffle Risotto", True, 799),
    ],
}

# (name, category, unit, unit_cost, reorder_level, max_stock)
INGREDIENTS_LIST = [
    # Produce
    ("Tomato", "Produce", "kg", 40.0, 10.0, 50.0),
    ("Onion", "Produce", "kg", 30.0, 10.0, 50.0),
    ("Garlic", "Produce", "kg", 120.0, 2.0, 10.0),
    ("Ginger", "Produce", "kg", 80.0, 2.0, 10.0),
    ("Potato", "Produce", "kg", 25.0, 15.0, 60.0),
    ("Bell Pepper (Red)", "Produce", "kg", 90.0, 5.0, 20.0),
    ("Mushroom", "Produce", "kg", 180.0, 3.0, 15.0),
    ("Lemon", "Produce", "kg", 70.0, 2.0, 10.0),
    ("Mint Leaves", "Produce", "kg", 50.0, 1.0, 5.0),
    ("Coriander", "Produce", "kg", 40.0, 1.0, 5.0),
    ("Spinach", "Produce", "kg", 35.0, 3.0, 12.0),
    ("Avocado", "Produce", "kg", 250.0, 2.0, 10.0),
    ("Basil Leaves", "Produce", "kg", 150.0, 0.5, 3.0),
    ("Paneer (Cottage Cheese)", "Dairy", "kg", 320.0, 5.0, 25.0),
    # Meat & Seafood
    ("Chicken Breast", "Meat", "kg", 260.0, 10.0, 40.0),
    ("Chicken Drumsticks", "Meat", "kg", 220.0, 8.0, 30.0),
    ("Mutton Boneless", "Meat", "kg", 650.0, 5.0, 20.0),
    ("Salmon Fillet", "Seafood", "kg", 1200.0, 3.0, 15.0),
    ("Prawns", "Seafood", "kg", 550.0, 4.0, 18.0),
    # Dairy
    ("Butter", "Dairy", "kg", 450.0, 5.0, 20.0),
    ("Fresh Cream", "Dairy", "liters", 200.0, 4.0, 16.0),
    ("Mozzarella Cheese", "Dairy", "kg", 480.0, 10.0, 40.0),
    ("Parmesan Cheese", "Dairy", "kg", 950.0, 2.0, 10.0),
    ("Milk", "Dairy", "liters", 60.0, 10.0, 40.0),
    ("Yogurt", "Dairy", "kg", 80.0, 5.0, 20.0),
    # Pantry / Grocery
    ("Refined Flour (Maida)", "Pantry", "kg", 45.0, 20.0, 100.0),
    ("Basmati Rice", "Pantry", "kg", 110.0, 25.0, 120.0),
    ("Penne Pasta", "Pantry", "kg", 130.0, 10.0, 40.0),
    ("Cooking Oil", "Pantry", "liters", 140.0, 20.0, 80.0),
    ("Olive Oil", "Pantry", "liters", 650.0, 5.0, 20.0),
    ("Sugar", "Pantry", "kg", 42.0, 15.0, 50.0),
    ("Salt", "Pantry", "kg", 20.0, 5.0, 20.0),
    # Spices
    ("Red Chilli Powder", "Spices", "kg", 240.0, 2.0, 8.0),
    ("Garam Masala", "Spices", "kg", 450.0, 1.0, 5.0),
    ("Turmeric Powder", "Spices", "kg", 180.0, 2.0, 8.0),
    ("Coriander Powder", "Spices", "kg", 200.0, 2.0, 8.0),
    ("Cumin Seeds", "Spices", "kg", 320.0, 1.0, 5.0),
    ("Cardamom", "Spices", "kg", 1800.0, 0.5, 2.0),
    ("Bay Leaves", "Spices", "packet", 80.0, 5.0, 20.0),
    ("Black Pepper", "Spices", "kg", 500.0, 1.0, 4.0),
    # Beverages
    ("Coffee Beans", "Beverage Supplies", "kg", 850.0, 5.0, 20.0),
    ("Tea Leaves", "Beverage Supplies", "kg", 320.0, 3.0, 12.0),
    ("Soda Water", "Beverage Supplies", "can", 15.0, 50.0, 200.0),
    ("Diet Cola Cans", "Beverage Supplies", "can", 25.0, 48.0, 192.0),
    # Bread / Baking
    ("Burger Buns", "Bakery", "units", 15.0, 50.0, 200.0),
    ("Pizza Dough", "Bakery", "kg", 80.0, 10.0, 40.0),
    ("Whole Wheat Bread", "Bakery", "loaf", 45.0, 10.0, 40.0),
    # Sauces / Condiments
    ("Tomato Ketchup", "Condiments", "kg", 120.0, 5.0, 20.0),
    ("Schezwan Sauce", "Condiments", "kg", 220.0, 3.0, 12.0),
    ("Mayonnaise", "Condiments", "kg", 280.0, 3.0, 12.0),
]

# 8 items that are intentionally LOW STOCK (quantity < reorder_level)
LOW_STOCK_ITEMS = [
    ("Chicken Breast", "Meat", "kg", 260.0, 10.0, 40.0, 4.0),   # qty=4, reorder=10
    ("Mozzarella Cheese", "Dairy", "kg", 480.0, 10.0, 40.0, 3.0),
    ("Paneer (Cottage Cheese)", "Dairy", "kg", 320.0, 5.0, 25.0, 2.0),
    ("Basmati Rice", "Pantry", "kg", 110.0, 25.0, 120.0, 12.0),
    ("Garam Masala", "Spices", "kg", 450.0, 1.0, 5.0, 0.3),
    ("Coffee Beans", "Beverage Supplies", "kg", 850.0, 5.0, 20.0, 1.5),
    ("Salmon Fillet", "Seafood", "kg", 1200.0, 3.0, 15.0, 1.0),
    ("Pizza Dough", "Bakery", "kg", 80.0, 10.0, 40.0, 2.5),
]

SUPPLIER_NAMES = [
    "Aggarwal Fresh Produce Pvt Ltd", "Mumbai Meat Masters", "Delhi Dairy Distributors",
    "Bangalore Spice Hub", "Chennai Seafood Co", "Hyderabad Grain Traders",
    "Pune Organic Farms", "Kolkata Kitchen Supplies", "Rajasthan Dry Goods",
    "Kerala Coconut & Spice", "Gujarat Oils & Fats Pvt Ltd", "Maharashtra Poultry Farm",
    "North Star Beverages", "Green Valley Vegetables", "Indian Herbs & Botanicals",
    "Premium Dairy Solutions", "Fast Grocery Wholesale", "National Food Distributors",
    "Authentic Spices Import", "Bharat Cold Chain Logistics",
]

INDIAN_NAMES = [
    "Rajesh Kumar", "Priya Sharma", "Amit Singh", "Sunita Verma", "Rahul Gupta",
    "Anita Patel", "Vikram Mehta", "Kavita Nair", "Sanjay Rao", "Deepika Joshi",
    "Arun Malhotra", "Pooja Iyer", "Suresh Reddy", "Meena Agarwal", "Kiran Tiwari",
    "Neha Bhatt", "Ravi Chandra", "Shilpa Mishra", "Manoj Dubey", "Rekha Pillai",
    "Arjun Shetty", "Divya Choudhary", "Abhishek Pandey", "Sundar Krishnan",
    "Gayatri Bose", "Harish Nayar", "Swati Shah", "Vivek Bansal", "Ishaan Saxena",
    "Aishwarya Kulkarni", "Gaurav Yadav", "Pallavi Desai", "Rohit Kapoor", "Tanvi Thakur",
    "Lokesh Goyal", "Vandana Tripathi", "Nikhil Menon", "Shraddha Garg", "Tushar Bhatia",
    "Nandini Hegde", "Sandeep Chatterjee", "Rekha Dixit", "Anand Srivastava",
    "Bhavna Varma", "Chirag Upadhyay", "Deepa Jain", "Eshan Kaur", "Falguni Solanki",
    "Girish Ramesh", "Hema Thakker", "Ishita Mathur", "Jagdish Patil", "Kritika Walia",
]


async def seed_data():
    logger.info("🚀 Starting database seed...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database schema created fresh")

    async with AsyncSessionLocal() as session:

        # ── Admin User ──
        admin = User(
            email="admin@restaurant.com",
            hashed_password=get_password_hash("Admin@123"),
            full_name="Restaurant Admin",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
        )
        session.add(admin)

        # Staff user
        staff = User(
            email="staff@restaurant.com",
            hashed_password=get_password_hash("Staff@123"),
            full_name="Floor Manager",
            role=UserRole.MANAGER,
            is_active=True,
            is_verified=True,
        )
        session.add(staff)
        await session.flush()
        logger.info("✅ Admin + Staff users created")

        # ── 1. Suppliers ──
        suppliers = []
        categories = ["Produce", "Meat & Seafood", "Dairy", "Beverages", "Dry Goods", "Spices", "Bakery"]
        for i in range(len(SUPPLIER_NAMES)):
            s = Supplier(
                name=SUPPLIER_NAMES[i],
                contact_person=random.choice(INDIAN_NAMES),
                email=f"contact{i+1}@supplier{i+1}.com",
                phone=f"+91 9{random.randint(100000000, 999999999)}",
                address=f"{random.randint(1,200)}, {random.choice(['MG Road','Link Road','Station Road','Market Street'])}, {random.choice(['Mumbai','Delhi','Bangalore','Chennai','Pune'])} - {random.randint(400001,600001)}",
                category=categories[i % len(categories)],
                items_supplied=f"Fresh {categories[i % len(categories)].lower()} supplies for restaurant operations",
                payment_terms=random.choice(["Net 15", "Net 30", "COD", "Weekly"]),
                delivery_schedule=random.choice(["Mon & Thu", "Tue & Fri", "Daily", "Weekly on Wed", "Mon, Wed & Fri"]),
                is_active=True,
            )
            session.add(s)
            suppliers.append(s)

        # Add more suppliers to reach 85
        extra_supplier_suffixes = [
            "Agri Solutions", "Fresh Farms", "Food Hub", "Bulk Traders",
            "Prime Supplies", "City Distributors", "Quality Foods", "Quick Deliver",
            "National Bazaar", "Royal Kitchen", "Sunrise Foods", "Heritage Imports",
            "Metro Wholesale", "Sagar Seafoods", "Alpine Dairies", "Green Harvest",
            "Spice Route Pvt", "Cloud Nine Beverages", "Harvest Moon", "Golden Grain",
            "Desert Rose Organics", "Himalayan Herbs", "Coastal Catch", "Valley View Farms",
            "Urban Harvest", "Farmgate Direct", "Apex Food Supplies", "Metro Mart",
            "Eastern Exports", "Western Wholesalers", "Southern Spices", "Northern Naturals",
            "Central Kitchen Supply", "Island Fresh", "Mainland Meats", "Heritage Poultry",
            "Gourmet Imports", "Budget Bulk", "Premium Select", "Star Supplier",
            "Diamond Foods", "Gold Standard Kitchens", "Silver Line Foods", "Platinum Provisions",
            "Crown Spices", "Eagle Eye Logistics", "Swift Supplies", "Power Pack Foods",
            "Excel Traders", "Alpha Foods", "Beta Beverages", "Gamma Grains",
            "Delta Dairy", "Epsilon Exports", "Zeta Produce", "Eta Herbs",
            "Theta Organics", "Iota Imports", "Kappa Kitchen", "Lambda Logistics",
            "Mu Masalas", "Nu Noodles", "Xi Xtra Fresh",
        ]
        for idx, suffix in enumerate(extra_supplier_suffixes):
            s = Supplier(
                name=f"{suffix} Co",
                contact_person=random.choice(INDIAN_NAMES),
                email=f"info{idx+100}@{suffix.lower().replace(' ', '')}.in",
                phone=f"+91 8{random.randint(100000000, 999999999)}",
                address=f"Plot {random.randint(1,500)}, MIDC, {random.choice(['Thane','Nashik','Vapi','Surat','Ahmedabad'])}",
                category=random.choice(categories),
                items_supplied="Various food and kitchen supplies",
                payment_terms=random.choice(["Net 15", "Net 30", "COD", "Weekly"]),
                delivery_schedule=random.choice(["Mon & Thu", "Daily", "Weekly"]),
                is_active=random.choice([True, True, True, False]),
            )
            session.add(s)
            suppliers.append(s)

        await session.flush()
        logger.info(f"✅ Inserted {len(suppliers)} Suppliers")

        # ── 2. Inventory ──
        inventory_items = []

        # First add LOW STOCK items so dashboard shows alerts
        for name, cat, unit, cost, reorder, max_stk, low_qty in LOW_STOCK_ITEMS:
            inv = Inventory(
                ingredient_name=name,
                category=cat,
                quantity=low_qty,          # BELOW reorder_level on purpose
                unit=unit,
                unit_cost=Decimal(str(cost)),
                reorder_level=reorder,
                max_stock=max_stk,
                supplier_id=random.choice(suppliers).id,
                expiry_date=datetime.now(timezone.utc) + timedelta(days=random.randint(3, 20)),
                last_restocked=datetime.now(timezone.utc) - timedelta(days=random.randint(10, 20)),
                location=random.choice(["Cold Storage 1", "Pantry Rack A", "Counter Shelves"]),
                is_active=True,
            )
            session.add(inv)
            inventory_items.append(inv)

        # Add all normal ingredients (at healthy stock levels)
        for name, cat, unit, cost, reorder, max_stk in INGREDIENTS_LIST:
            # Skip duplicates already added in LOW_STOCK_ITEMS
            if any(i.ingredient_name == name for i in inventory_items):
                continue
            inv = Inventory(
                ingredient_name=name,
                category=cat,
                quantity=round(random.uniform(reorder * 1.5, max_stk), 2),
                unit=unit,
                unit_cost=Decimal(str(cost)),
                reorder_level=reorder,
                max_stock=max_stk,
                supplier_id=random.choice(suppliers).id,
                expiry_date=datetime.now(timezone.utc) + timedelta(days=random.randint(5, 90)),
                last_restocked=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10)),
                location=random.choice(["Cold Storage 1", "Pantry Rack A", "Dry Room 2", "Counter Shelves"]),
                is_active=True,
            )
            session.add(inv)
            inventory_items.append(inv)

        # Fill up to 160 total with extra generic items
        extra_items = [
            ("Ghee", "Dairy", "kg", 600.0), ("Coconut Milk", "Pantry", "can", 90.0),
            ("Soy Sauce", "Condiments", "liters", 180.0), ("Chilli Sauce", "Condiments", "liters", 160.0),
            ("Vinegar", "Condiments", "liters", 80.0), ("Baking Soda", "Pantry", "kg", 60.0),
            ("Corn Flour", "Pantry", "kg", 55.0), ("Semolina (Rava)", "Pantry", "kg", 48.0),
            ("Besan (Gram Flour)", "Pantry", "kg", 65.0), ("Urad Dal", "Pantry", "kg", 120.0),
            ("Chana Dal", "Pantry", "kg", 95.0), ("Toor Dal", "Pantry", "kg", 110.0),
            ("Kidney Beans (Rajma)", "Pantry", "kg", 130.0), ("Chickpeas (Chole)", "Pantry", "kg", 100.0),
            ("Fenugreek Seeds", "Spices", "kg", 280.0), ("Mustard Seeds", "Spices", "kg", 200.0),
            ("Dry Red Chilli", "Spices", "kg", 320.0), ("Tamarind", "Condiments", "kg", 140.0),
            ("Jaggery", "Pantry", "kg", 80.0), ("Vanilla Essence", "Bakery", "liters", 2200.0),
            ("Cocoa Powder", "Bakery", "kg", 480.0), ("Whipped Cream", "Dairy", "liters", 350.0),
            ("Ice Cream (Vanilla)", "Dairy", "liters", 280.0), ("Chocolate Chips", "Bakery", "kg", 650.0),
            ("Strawberry Jam", "Condiments", "kg", 320.0), ("Peanut Butter", "Condiments", "kg", 280.0),
            ("Almonds", "Dry Fruits", "kg", 1200.0), ("Cashews", "Dry Fruits", "kg", 1000.0),
            ("Raisins", "Dry Fruits", "kg", 400.0), ("Pistachios", "Dry Fruits", "kg", 1800.0),
            ("Tender Coconut Water", "Beverage Supplies", "liters", 40.0),
            ("Orange Juice", "Beverage Supplies", "liters", 120.0),
            ("Pineapple Juice", "Beverage Supplies", "liters", 100.0),
            ("Pomegranate Juice", "Beverage Supplies", "liters", 180.0),
            ("Green Tea Bags", "Beverage Supplies", "box", 250.0),
            ("Napkins", "Disposables", "pack", 45.0), ("Straws", "Disposables", "box", 80.0),
            ("Foil Wrap", "Disposables", "roll", 120.0), ("Food Containers", "Disposables", "box", 350.0),
            ("Paper Cups", "Disposables", "box", 180.0), ("Wooden Skewers", "Disposables", "pack", 60.0),
            ("Charcoal", "Fuel", "kg", 40.0), ("LPG Gas Cylinders", "Fuel", "units", 900.0),
            ("Dish Soap", "Cleaning", "liters", 200.0), ("Sanitizer", "Cleaning", "liters", 350.0),
            ("Bleach", "Cleaning", "liters", 90.0), ("Floor Cleaner", "Cleaning", "liters", 150.0),
            ("Gloves (Kitchen)", "Cleaning", "box", 280.0), ("Sponges", "Cleaning", "pack", 120.0),
            ("Aluminium Foil", "Disposables", "roll", 180.0),
            ("Parchment Paper", "Bakery", "roll", 220.0),
        ]
        for name, cat, unit, cost in extra_items:
            if len(inventory_items) >= 160:
                break
            reorder = random.choice([5.0, 10.0, 15.0, 20.0])
            max_stk = reorder * 4
            inv = Inventory(
                ingredient_name=name,
                category=cat,
                quantity=round(random.uniform(reorder * 1.2, max_stk), 2),
                unit=unit,
                unit_cost=Decimal(str(cost)),
                reorder_level=reorder,
                max_stock=max_stk,
                supplier_id=random.choice(suppliers).id,
                expiry_date=datetime.now(timezone.utc) + timedelta(days=random.randint(30, 365)),
                last_restocked=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 14)),
                location=random.choice(["Pantry Rack B", "Cold Storage 2", "Dry Storage Shelf C", "Storeroom"]),
                is_active=True,
            )
            session.add(inv)
            inventory_items.append(inv)

        await session.flush()
        logger.info(f"✅ Inserted {len(inventory_items)} Inventory Items ({len(LOW_STOCK_ITEMS)} low-stock)")

        # ── 3. Menu Items ──
        menu_items = []
        for category, items in FOOD_TEMPLATES.items():
            for name, is_veg, base_price in items:
                price = base_price + random.randint(-20, 30)
                cost_price = int(price * random.uniform(0.28, 0.38))
                item = Menu(
                    name=name,
                    description=f"Freshly prepared {name} with authentic flavors, premium ingredients, and exquisite plating. A must-try!",
                    category=category,
                    price=Decimal(str(price)),
                    cost_price=Decimal(str(cost_price)),
                    image_url=None,
                    is_available=True,
                    is_vegetarian=is_veg,
                    calories=random.randint(150, 950),
                    preparation_time=random.choice([10, 15, 20, 25, 30, 40]),
                    total_orders=0,
                    rating=round(random.uniform(3.8, 5.0), 1),
                )
                session.add(item)
                menu_items.append(item)
        await session.flush()
        logger.info(f"✅ Inserted {len(menu_items)} Menu Items")

        # ── 4. Recipe Links ──
        for item in menu_items:
            selected = random.sample(inventory_items[:50], k=random.randint(2, 4))
            for inv in selected:
                session.add(RecipeItem(
                    menu_item_id=item.id,
                    inventory_id=inv.id,
                    quantity_required=round(random.uniform(0.05, 0.5), 3),
                ))
        await session.flush()
        logger.info("✅ Created Recipe Links (menu ↔ inventory)")

        # ── 5. Employees ──
        positions = [
            ("Head Chef", "Kitchen", 65000), ("Sous Chef", "Kitchen", 50000),
            ("Pastry Chef", "Kitchen", 45000), ("Line Cook", "Kitchen", 28000),
            ("Kitchen Helper", "Kitchen", 18000), ("Dishwasher", "Kitchen", 15000),
            ("Restaurant Manager", "Administration", 75000), ("Floor Supervisor", "Front of House", 40000),
            ("Waiter/Server", "Front of House", 22000), ("Captain Waiter", "Front of House", 30000),
            ("Hostess", "Front of House", 25000), ("Bartender", "Bar", 30000),
            ("Barista", "Bar", 25000), ("Cashier", "Administration", 22000),
            ("Accountant", "Administration", 40000), ("Delivery Executive", "Delivery", 20000),
            ("Storekeeper", "Administration", 25000), ("Cleaner", "Housekeeping", 14000),
        ]
        emp_emails_used = set()
        for i in range(105):
            pos, dept, base_sal = random.choice(positions)
            name = random.choice(INDIAN_NAMES + [fake.name() for _ in range(5)])
            email_base = name.lower().replace(" ", ".") + str(i)
            email = f"{email_base}@restaurant-staff.com"
            if email in emp_emails_used:
                email = f"{email_base}.{random.randint(1,999)}@restaurant-staff.com"
            emp_emails_used.add(email)
            session.add(Employee(
                name=name,
                email=email,
                phone=f"+91 7{random.randint(100000000, 999999999)}",
                position=pos,
                department=dept,
                salary=Decimal(str(base_sal + random.randint(-3000, 10000))),
                shift=random.choice(["Morning (7am-3pm)", "Afternoon (11am-7pm)", "Evening (3pm-11pm)", "Night (10pm-6am)"]),
                hire_date=datetime.now(timezone.utc) - timedelta(days=random.randint(30, 1000)),
                is_active=random.choice([True, True, True, True, False]),
            ))
        await session.flush()
        logger.info("✅ Inserted 105 Employees")

        # ── 6. Customers ──
        customers = []
        segments = ["VIP High Value", "Regular Loyalist", "Occasional Visitor", "New Customer", "At-Risk"]
        customer_emails_used = set()
        for i in range(210):
            name = random.choice(INDIAN_NAMES + [fake.name() for _ in range(10)])
            email = f"{name.lower().replace(' ', '.').replace('/', '')}{i}@gmail.com"
            if email in customer_emails_used:
                email = f"customer{i}.{random.randint(1,9999)}@gmail.com"
            customer_emails_used.add(email)
            cust = Customer(
                name=name,
                email=email,
                phone=f"+91 9{random.randint(100000000, 999999999)}",
                address=f"{random.randint(1,500)}, {random.choice(['Bandra','Koramangala','Hauz Khas','Banjara Hills','Viman Nagar'])}, {random.choice(['Mumbai','Bangalore','Delhi','Hyderabad','Pune'])}",
                total_orders=0,
                total_spent=Decimal("0.0"),
                segment=random.choice(segments),
                loyalty_points=random.randint(0, 2000),
                preferences=random.choice([
                    "No onions", "Spicy food lover", "Gluten-free", "Vegetarian only",
                    "Allergy to nuts", "Prefers window table", "Lactose intolerant",
                    "Jain food preferred", None, None,
                ]),
                is_active=True,
            )
            session.add(cust)
            customers.append(cust)
        await session.flush()
        logger.info(f"✅ Inserted {len(customers)} Customers")

        # ── 7. Orders (550 across past 30 days + 15 today) ──
        orders = []
        start_date = datetime.now(timezone.utc) - timedelta(days=30)

        # Weight toward delivered
        statuses_pool = (
            [OrderStatus.DELIVERED] * 70 +
            [OrderStatus.CONFIRMED] * 15 +
            [OrderStatus.PREPARING] * 8 +
            [OrderStatus.CANCELLED] * 7
        )

        def make_order(backdated_by_days: float):
            cust = random.choice(customers)
            status = random.choice(statuses_pool)
            pay_status = PaymentStatus.PAID if status == OrderStatus.DELIVERED else (
                PaymentStatus.PENDING if status in [OrderStatus.CONFIRMED, OrderStatus.PREPARING]
                else PaymentStatus.FAILED
            )
            order_date = start_date + timedelta(
                days=backdated_by_days,
                hours=random.randint(11, 22),
                minutes=random.randint(0, 59),
            )
            n_items = random.randint(1, 5)
            selected = random.sample(menu_items, k=n_items)
            subtotal = Decimal("0.0")

            order = Order(
                customer_id=cust.id,
                status=status,
                payment_status=pay_status,
                total_amount=Decimal("0.0"),
                discount=Decimal(str(random.choice([0, 0, 0, 0, 50, 100, 200]))),
                tax=Decimal("0.0"),
                notes=random.choice([
                    "Extra spicy please", "Less salt", "No onions", "Birthday celebration",
                    "Anniversary dinner", "Allergy: nuts", None, None, None,
                ]),
                table_number=str(random.randint(1, 25)) if random.random() > 0.4 else None,
                created_at=order_date,
                updated_at=order_date,
            )
            session.add(order)
            return order, selected, cust, subtotal, pay_status, order_date

        for i in range(565):
            # Spread across 30 days; last 3 days are denser (recent activity)
            if i < 50:
                day_offset = random.uniform(27, 30)  # last 3 days — many orders
            elif i < 150:
                day_offset = random.uniform(21, 30)  # last 9 days
            else:
                day_offset = random.uniform(0, 30)   # all 30 days

            order, selected, cust, subtotal, pay_status, order_date = make_order(day_offset)
            await session.flush()

            for item in selected:
                qty = random.randint(1, 3)
                line = item.price * qty
                subtotal += line
                item.total_orders += qty
                session.add(OrderItem(
                    order_id=order.id,
                    menu_item_id=item.id,
                    quantity=qty,
                    unit_price=item.price,
                    total_price=line,
                    notes=None,
                    created_at=order_date,
                ))

            net = max(Decimal("0.0"), subtotal - order.discount)
            order.tax = round(net * Decimal("0.05"), 2)
            order.total_amount = net + order.tax

            if order.status in [OrderStatus.DELIVERED, OrderStatus.CONFIRMED]:
                cust.total_orders += 1
                cust.total_spent += order.total_amount

            if pay_status == PaymentStatus.PAID:
                session.add(Payment(
                    order_id=order.id,
                    amount=order.total_amount,
                    method=random.choice(["cash", "card", "upi", "net_banking", "upi", "upi"]),
                    status=PaymentStatus.PAID,
                    transaction_id=f"TXN{random.randint(10000000, 99999999)}",
                    created_at=order_date,
                ))
            orders.append(order)

        await session.flush()
        logger.info(f"✅ Inserted {len(orders)} Orders + Payments")

        # ── 8. Reviews (310) ──
        review_pool = [
            (5, "Absolutely loved the food! The butter chicken was cooked to perfection. Will definitely return!"),
            (5, "Excellent service and very courteous staff. Chef's signature platter is a must-try!"),
            (5, "Beautiful ambiance and delicious food. Paneer tikka was the best I've ever had."),
            (5, "Amazing dining experience. Portions are generous and flavors are authentic."),
            (5, "Best restaurant in the city. The biryani is incomparable!"),
            (4, "Great food and service. Slightly expensive but worth every rupee."),
            (4, "Nice quiet dining atmosphere. The chicken curry was soft and flavorful."),
            (4, "Very good overall. The pasta was creamy and well-presented."),
            (4, "Enjoyed my meal. Would have loved a slightly larger portion for the price."),
            (3, "Decent food but delivery took almost an hour. Packaging was very neat."),
            (3, "Average taste. Samosa chaat was good but the pizza arrived cold."),
            (3, "OK experience. Nothing extraordinary but nothing bad either."),
            (2, "Service was very slow. Waited 45 minutes just to get drinks. Disappointing."),
            (2, "The burger was dry and overcooked. Does not match the high ratings."),
            (1, "Terrible experience. Found a foreign object in the biryani!"),
            (1, "Rude staff. My order was cancelled without any information or refund."),
        ]
        for i in range(310):
            rating = random.choice([5, 5, 5, 4, 4, 4, 3, 3, 2, 1])
            matching = [(r, c) for r, c in review_pool if r == rating]
            _, comment = random.choice(matching) if matching else (rating, "Good experience overall.")
            sentiment = "positive" if rating >= 4 else ("neutral" if rating == 3 else "negative")
            session.add(Review(
                customer_id=random.choice(customers).id,
                order_id=random.choice(orders).id,
                rating=rating,
                comment=comment,
                sentiment=sentiment,
                sentiment_score=round(
                    random.uniform(0.75, 0.99) if sentiment == "positive"
                    else random.uniform(0.40, 0.60) if sentiment == "neutral"
                    else random.uniform(0.01, 0.35), 2
                ),
                is_verified=random.choice([True, True, False]),
            ))
        await session.flush()
        logger.info("✅ Inserted 310 Reviews")

        # ── 9. Food Waste (155) ──
        reasons = ["expired", "overcooked", "spoiled", "unsold excess", "dropped/damaged", "prep waste"]
        for i in range(155):
            inv = random.choice(inventory_items)
            qty = round(random.uniform(0.5, 8.0), 1)
            cost_impact = Decimal(str(qty)) * (inv.unit_cost or Decimal("50"))
            waste_date = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30))
            session.add(FoodWaste(
                inventory_id=inv.id,
                ingredient_name=inv.ingredient_name,
                quantity_wasted=qty,
                unit=inv.unit,
                reason=random.choice(reasons),
                cost=round(cost_impact, 2),
                waste_date=waste_date,
                created_at=waste_date,
            ))
        await session.flush()
        logger.info("✅ Inserted 155 Food Waste Logs")

        await session.commit()

    # ── Summary ──
    print()
    print("=" * 55)
    print("      Database Seed Completed Successfully!")
    print("=" * 55)
    print(f"  Admin User  : admin@restaurant.com / Admin@123")
    print(f"  Staff User  : staff@restaurant.com / Staff@123")
    print(f"  Suppliers   : {len(suppliers)}")
    print(f"  Inventory   : {len(inventory_items)} items  ({len(LOW_STOCK_ITEMS)} low-stock)")
    print(f"  Menu Items  : {len(menu_items)}")
    print(f"  Employees   : 105")
    print(f"  Customers   : {len(customers)}")
    print(f"  Orders      : {len(orders)}")
    print(f"  Reviews     : 310")
    print(f"  Food Waste  : 155 logs")
    print("=" * 55)
    print()


if __name__ == "__main__":
    asyncio.run(seed_data())
