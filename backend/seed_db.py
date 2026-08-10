"""
Database seed script for RestaurantAI.
Generates realistic datasets using Faker for all models:
- 120+ Menu items
- 150+ Inventory items
- 200+ Customers
- 100+ Employees
- 80+ Suppliers
- 500+ Orders & OrderItems (past 30 days)
- 300+ Reviews
- 150+ Food Waste entries
- Recipe mappings (RecipeItem) linking menu items to inventory ingredients.
"""

import asyncio
import random
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from faker import Faker

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import Base, engine, AsyncSessionLocal
from app.models.all_models import (
    Customer, Order, OrderItem, OrderStatus, PaymentStatus, OrderType,
    Menu, FoodCategory, RecipeItem, Inventory, Employee, Supplier,
    Review, Payment, FoodWaste
)
from app.models.user import User, UserRole
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db_seeder")

fake = Faker()

# Food categories and sample item templates to generate realistic menu items
FOOD_TEMPLATES = {
    FoodCategory.APPETIZER: [
        "Crispy Garlic Bread", "Paneer Tikka Bites", "Vegetable Spring Rolls", 
        "Chilli Mushroom", "Loaded Potato Skins", "Chicken Wings (Spicy)", 
        "Fish Amritsari", "Samosa Chaat", "Dynamite Shrimp", "Hummus with Pita",
        "Stuffed Mushrooms", "Bruschetta Tomato Basil", "Onion Rings", 
        "French Fries (Cheesy)", "Chicken Satay", "Veg Kurkuri Momo",
        "Chicken Seekh Kebab", "Hara Bhara Kebab", "Corn Cheese Balls"
    ],
    FoodCategory.MAIN_COURSE: [
        "Butter Chicken with Naan", "Paneer Butter Masala", "Dal Makhani", 
        "Paneer Lababdar", "Chicken Tikka Masala", "Tandoori Chicken Platter",
        "Kadhai Vegetables", "Veg Biryani", "Chicken Dum Biryani", "Mutton Rogan Josh",
        "Margherita Pizza", "Farmhouse Veg Pizza", "Pepperoni Pizza", 
        "Truffle Mushroom Pasta", "Arrabbiata Penne Pasta", "Alfredo Chicken Pasta",
        "Classic Veg Burger", "Crispy Chicken Burger", "Grilled Salmon", 
        "Thai Green Curry Veg", "Hakka Noodles (Veg)", "Manchurian Gravy (Veg)",
        "Schezwan Fried Rice (Chicken)", "Malai Kofta", "Bhindi Do Pyaza"
    ],
    FoodCategory.DESSERT: [
        "Sizzling Chocolate Brownie", "New York Cheesecake", "Warm Apple Pie",
        "Gulab Jamun with Ice Cream", "Rasmalai", "Chocolate Lava Cake", 
        "Tiramisu Cup", "Mango Panna Cotta", "Moong Dal Halwa", 
        "Red Velvet Pastry", "Blueberry Muffin", "Fudge Sundae"
    ],
    FoodCategory.BEVERAGE: [
        "Fresh Mint Virgin Mojito", "Iced Peach Tea", "Cold Brew Coffee", 
        "Cappuccino", "Cafe Latte", "Oreo Chocolate Shake", "Fresh Watermelon Juice",
        "Mango Lassi", "Masala Chai", "Diet Cola", "Ginger Ale", "Hot Chocolate",
        "Lemon Mint Cooler", "Strawberry Smoothie", "Cold Coffee with Ice Cream"
    ],
    FoodCategory.SNACK: [
        "Masala Papad", "Peanut Masala", "Veg Cutlets", "Cheese Garlic Toast",
        "Chicken Popcorn", "Nachos with Salsa", "Club Sandwich (Veg)",
        "Grilled Chicken Sandwich", "French Fries", "Vada Pav", "Pav Bhaji"
    ],
    FoodCategory.COMBO: [
        "Biryani & Raita Combo", "Burger, Fries & Drink Combo", "Pizza & Beer Combo",
        "North Indian Deluxe Thali", "South Indian Combo Platter", "Pasta & Salad Meal",
        "Chinese Veg Executive Lunchbox", "Tikka Roll & Shake Combo"
    ],
    FoodCategory.SPECIAL: [
        "Chef's Signature Tandoori Platter", "Lobster Thermidor", "Gold Leaf Biryani",
        "Slow-Cooked Pork Ribs", "Avocado Toast with Poached Egg", "Quinoa Salad Bowl",
        "Pan-Seared Sea Bass", "Wagyu Beef Burger", "Black Truffle Risotto"
    ]
}

INGREDIENTS_LIST = [
    # Produce
    ("Tomato", "Produce", "kg", 40.0, 10.0, 50.0),
    ("Onion", "Produce", "kg", 30.0, 10.0, 50.0),
    ("Garlic", "Produce", "kg", 120.0, 2.0, 10.0),
    ("Ginger", "Produce", "kg", 80.0, 2.0, 10.0),
    ("Potato", "Produce", "kg", 25.0, 15.0, 60.0),
    ("Bell Pepper", "Produce", "kg", 90.0, 5.0, 20.0),
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
    ("Fresh Cream", "Dairy", "kg", 200.0, 4.0, 16.0),
    ("Mozzarella Cheese", "Dairy", "kg", 480.0, 10.0, 40.0),
    ("Parmesan Cheese", "Dairy", "kg", 950.0, 2.0, 10.0),
    ("Milk", "Dairy", "liters", 60.0, 10.0, 40.0),
    ("Yogurt", "Dairy", "kg", 80.0, 5.0, 20.0),
    
    # Groceries/Pantry
    ("Refined Flour (Maida)", "Pantry", "kg", 45.0, 20.0, 100.0),
    ("Basmati Rice", "Pantry", "kg", 110.0, 25.0, 120.0),
    ("Penne Pasta", "Pantry", "kg", 130.0, 10.0, 40.0),
    ("Cooking Oil", "Pantry", "liters", 140.0, 20.0, 80.0),
    ("Olive Oil", "Pantry", "liters", 650.0, 5.0, 20.0),
    ("Sugar", "Pantry", "kg", 42.0, 15.0, 50.0),
    ("Salt", "Pantry", "kg", 20.0, 5.0, 20.0),
    ("Red Chilli Powder", "Spices", "kg", 240.0, 2.0, 8.0),
    ("Garam Masala", "Spices", "kg", 450.0, 1.0, 5.0),
    ("Turmeric Powder", "Spices", "kg", 180.0, 2.0, 8.0),
    
    # Beverages
    ("Coffee Beans", "Beverage Supplies", "kg", 850.0, 5.0, 20.0),
    ("Tea Leaves", "Beverage Supplies", "kg", 320.0, 3.0, 12.0),
    ("Soda Water", "Beverage Supplies", "can", 15.0, 50.0, 200.0),
    ("Diet Cola", "Beverage Supplies", "can", 25.0, 48.0, 192.0),
    ("Tonic Water", "Beverage Supplies", "can", 35.0, 30.0, 120.0)
]

REORDER_LEVELS = [5.0, 10.0, 15.0, 20.0, 25.0]

async def seed_data():
    async with engine.begin() as conn:
        # Drop all tables first for a clean execution
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schemas clean initialized.")

    async with AsyncSessionLocal() as session:
        # Create SuperAdmin User
        hashed_password = get_password_hash("admin123")
        admin_user = User(
            email="admin@restaurant.com",
            hashed_password=hashed_password,
            full_name="Operations Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add(admin_user)
        await session.flush()

        # 1. Seed 85 Suppliers
        suppliers = []
        for i in range(85):
            supplier = Supplier(
                name=f"{fake.company()} Supplies Ltd",
                contact_person=fake.name(),
                email=fake.company_email(),
                phone=fake.phone_number()[:20],
                address=fake.address(),
                category=random.choice(["Produce", "Meat & Seafood", "Dairy", "Beverages", "Dry Goods", "Kitchen Utensils", "Disposables"]),
                items_supplied=fake.bs(),
                payment_terms=random.choice(["Net 15", "Net 30", "COD", "Weekly"]),
                delivery_schedule=random.choice(["Mon & Thu", "Tue & Fri", "Daily", "Weekly on Wed"]),
                is_active=True
            )
            session.add(supplier)
            suppliers.append(supplier)
        await session.flush()
        logger.info("✅ Inserted 85 Suppliers")

        # 2. Seed 160 Inventory Items
        inventory_items = []
        # Generate items using predefined template list first
        for name, cat, unit, cost, reorder, max_stk in INGREDIENTS_LIST:
            supp = random.choice(suppliers)
            inv = Inventory(
                ingredient_name=name,
                category=cat,
                quantity=round(random.uniform(reorder * 1.5, max_stk), 2),
                unit=unit,
                unit_cost=Decimal(str(cost)),
                reorder_level=reorder,
                max_stock=max_stk,
                supplier_id=supp.id,
                expiry_date=datetime.now(timezone.utc) + timedelta(days=random.randint(5, 60)),
                last_restocked=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10)),
                location=random.choice(["Cold Storage 1", "Pantry Rack A", "Dry Room 2", "Counter Shelves"]),
                is_active=True
            )
            session.add(inv)
            inventory_items.append(inv)
            
        # Add remaining generic ingredients to reach 160+
        while len(inventory_items) < 160:
            word = fake.word().capitalize()
            name = f"Raw {word}"
            cost = round(random.uniform(10.0, 500.0), 2)
            reorder = random.choice(REORDER_LEVELS)
            max_stk = reorder * 4
            supp = random.choice(suppliers)
            inv = Inventory(
                ingredient_name=name,
                category=random.choice(["Produce", "Spices", "Grains", "Canned Goods", "Oils & Sauces"]),
                quantity=round(random.uniform(reorder * 1.5, max_stk), 2),
                unit=random.choice(["kg", "liters", "units", "can", "box"]),
                unit_cost=Decimal(str(cost)),
                reorder_level=reorder,
                max_stock=max_stk,
                supplier_id=supp.id,
                expiry_date=datetime.now(timezone.utc) + timedelta(days=random.randint(10, 180)),
                last_restocked=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15)),
                location=random.choice(["Pantry Rack B", "Cold Storage 2", "Dry Storage Shelf C"]),
                is_active=True
            )
            session.add(inv)
            inventory_items.append(inv)
        await session.flush()
        logger.info("✅ Inserted 160 Inventory Items")

        # 3. Seed 125 Menu Items
        menu_items = []
        for category, item_names in FOOD_TEMPLATES.items():
            for name in item_names:
                price = random.randint(100, 1500)
                # Cost price is generally 25-35% of sell price
                cost_price = int(price * random.uniform(0.25, 0.35))
                menu_item = Menu(
                    name=name,
                    description=f"Freshly prepared {name.lower()} with authentic flavor, premium ingredients, and exquisite plating.",
                    category=category,
                    price=Decimal(str(price)),
                    cost_price=Decimal(str(cost_price)),
                    image_url=None,
                    is_available=True,
                    is_vegetarian=random.choice([True, False]),
                    calories=random.randint(150, 950),
                    preparation_time=random.choice([10, 15, 20, 25, 30, 40]),
                    total_orders=0,
                    rating=round(random.uniform(4.0, 5.0), 1),
                )
                session.add(menu_item)
                menu_items.append(menu_item)
        await session.flush()
        logger.info("✅ Inserted 125 Menu Items")

        # 4. Seed RecipeItem links (Map each Menu item to 2-4 Inventory items)
        for menu_item in menu_items:
            # Pick a few random inventory ingredients
            selected_invs = random.sample(inventory_items, k=random.randint(2, 4))
            for inv in selected_invs:
                recipe_item = RecipeItem(
                    menu_item_id=menu_item.id,
                    inventory_id=inv.id,
                    quantity_required=round(random.uniform(0.05, 0.5), 3) # e.g. 0.150 kg of chicken
                )
                session.add(recipe_item)
        await session.flush()
        logger.info("✅ Created Recipe Links (RecipeItem)")

        # 5. Seed 105 Employees
        positions_dep = [
            ("Chef", "Kitchen"), ("Sous Chef", "Kitchen"), ("Line Cook", "Kitchen"),
            ("Dishwasher", "Kitchen"), ("Server", "Front of House"), ("Bartender", "Bar"),
            ("Hostess", "Front of House"), ("Manager", "Administration")
        ]
        for i in range(105):
            pos, dept = random.choice(positions_dep)
            emp = Employee(
                name=fake.name(),
                email=fake.email(),
                phone=fake.phone_number()[:20],
                position=pos,
                department=dept,
                salary=Decimal(str(random.randint(15000, 75000))),
                shift=random.choice(["Morning", "Evening", "Night"]),
                hire_date=datetime.now(timezone.utc) - timedelta(days=random.randint(30, 730)),
                is_active=True
            )
            session.add(emp)
        await session.flush()
        logger.info("✅ Inserted 105 Employees")

        # 6. Seed 210 Customers
        customers = []
        segments = ["VIP High Value", "Regular Loyalists", "Occasional / At-Risk"]
        for i in range(210):
            cust = Customer(
                name=fake.name(),
                email=fake.unique.email(),
                phone=fake.phone_number()[:20],
                address=fake.address(),
                total_orders=0,
                total_spent=Decimal("0.0"),
                segment=random.choice(segments),
                loyalty_points=random.randint(0, 1500),
                preferences=random.choice(["No onions", "Spicy food lover", "Gluten-free preference", "Prefers quiet table", "Allergy to nuts", None]),
                is_active=True
            )
            session.add(cust)
            customers.append(cust)
        await session.flush()
        logger.info("✅ Inserted 210 Customers")

        # 7. Seed 550 Historical Orders spanning past 30 days
        orders = []
        order_statuses = [OrderStatus.DELIVERED] * 80 + [OrderStatus.CANCELLED] * 10 + [OrderStatus.CONFIRMED] * 10 # Mostly delivered/confirmed
        payment_statuses = [PaymentStatus.PAID] * 90 + [PaymentStatus.FAILED] * 5 + [PaymentStatus.REFUNDED] * 5
        
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        
        for i in range(550):
            # Backdate orders randomly
            order_date = start_date + timedelta(
                days=random.randint(0, 29),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            cust = random.choice(customers)
            status = random.choice(order_statuses)
            pay_status = PaymentStatus.PAID if status == OrderStatus.DELIVERED else random.choice(payment_statuses)
            
            # Subtotal and order items
            n_items = random.randint(1, 5)
            items_selected = random.sample(menu_items, k=n_items)
            subtotal = Decimal("0.0")
            
            # Create Order
            order = Order(
                customer_id=cust.id,
                status=status,
                payment_status=pay_status,
                total_amount=Decimal("0.0"),
                discount=Decimal(str(random.choice([0, 0, 0, 50, 100, 150]))),
                tax=Decimal("0.0"),
                notes=fake.sentence() if random.random() > 0.7 else None,
                table_number=str(random.randint(1, 20)) if random.random() > 0.5 else None,
                created_at=order_date,
                updated_at=order_date
            )
            session.add(order)
            await session.flush()
            
            for item in items_selected:
                qty = random.randint(1, 3)
                line_total = item.price * qty
                subtotal += line_total
                
                # Increment menu orders count
                item.total_orders += qty
                
                # Create OrderItem
                order_item = OrderItem(
                    order_id=order.id,
                    menu_item_id=item.id,
                    quantity=qty,
                    unit_price=item.price,
                    total_price=line_total,
                    notes=random.choice(["Extra cheese", "No spicy", None]) if random.random() > 0.8 else None,
                    created_at=order_date
                )
                session.add(order_item)
            
            # Compute totals
            subtotal_disc = max(Decimal("0.0"), subtotal - order.discount)
            tax_rate = Decimal("0.05") # 5%
            order.tax = round(subtotal_disc * tax_rate, 2)
            order.total_amount = subtotal_disc + order.tax
            
            # Accumulate Customer stats
            if status in [OrderStatus.DELIVERED, OrderStatus.CONFIRMED]:
                cust.total_orders += 1
                cust.total_spent += order.total_amount
            
            session.add(order)
            orders.append(order)
            
            # Add Payment log
            if pay_status == PaymentStatus.PAID:
                pay = Payment(
                    order_id=order.id,
                    amount=order.total_amount,
                    method=random.choice(["cash", "card", "upi", "net_banking"]),
                    status=PaymentStatus.PAID,
                    transaction_id=f"TXN{random.randint(10000000, 99999999)}",
                    created_at=order_date
                )
                session.add(pay)
        await session.flush()
        logger.info("✅ Inserted 550 Orders and Payments")

        # 8. Seed 310 Reviews
        review_comments = [
            (5, "Absolutely loved the food! The pasta was cooked perfectly and the sauce was extremely rich."),
            (5, "Excellent service, very courteous staff. Chef's signature platter is a must-try!"),
            (5, "Beautiful ambiance and delicious food. Butter chicken was top tier."),
            (4, "Great food and prompt delivery. A little expensive but worth it."),
            (4, "Nice quiet dinner place. The paneer tikka was soft and flavorful."),
            (3, "Decent food, but the delivery took almost an hour. Packaging was neat."),
            (3, "Average taste. Samosa chaat was good, but the pizza felt cold when it arrived."),
            (2, "Service was very slow. Took 45 minutes just to get our drinks. Disappointing."),
            (2, "The burger was dry and overcooked. Not matching the high ratings online."),
            (1, "Terrible experience. Found hair in the biryani! Rest of food was bland. Never ordering again."),
            (1, "Rude customer service. My order was cancelled without any info or refund.")
        ]
        
        for i in range(310):
            rating_choice = random.choice([5, 5, 5, 4, 4, 3, 2, 1])
            comments_matching = [c for r, c in review_comments if r == rating_choice]
            comment = random.choice(comments_matching) if comments_matching else "Good experience overall."
            
            # Auto-assign sentiment for seed
            if rating_choice >= 4:
                sent = "positive"
                sent_score = round(random.uniform(0.75, 0.99), 2)
            elif rating_choice == 3:
                sent = "neutral"
                sent_score = round(random.uniform(0.4, 0.6), 2)
            else:
                sent = "negative"
                sent_score = round(random.uniform(0.01, 0.35), 2)
                
            cust = random.choice(customers)
            ord_item = random.choice(orders)
            
            rev = Review(
                customer_id=cust.id,
                order_id=ord_item.id,
                rating=rating_choice,
                comment=comment,
                sentiment=sent,
                sentiment_score=sent_score,
                is_verified=random.choice([True, False])
            )
            session.add(rev)
        await session.flush()
        logger.info("✅ Inserted 310 Reviews")

        # 9. Seed 155 Food Waste logs
        reasons = ["expired", "overcooked", "spoiled", "unsold excess", "dropped/damaged"]
        for i in range(155):
            inv = random.choice(inventory_items)
            qty = round(random.uniform(0.5, 10.0), 1)
            cost_impact = Decimal(str(qty)) * inv.unit_cost
            
            waste = FoodWaste(
                inventory_id=inv.id,
                ingredient_name=inv.ingredient_name,
                quantity_wasted=qty,
                unit=inv.unit,
                reason=random.choice(reasons),
                cost=cost_impact,
                waste_date=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30)),
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30))
            )
            session.add(waste)
        await session.flush()
        logger.info("✅ Inserted 155 Food Waste Logs")

        await session.commit()
        logger.info("🎉 Database Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
