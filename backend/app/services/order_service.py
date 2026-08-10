"""
Order Service — Business logic for order creation and state transitions.
Handles tax calculation (GST 5%), fetching current menu prices, and stock updates.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from typing import Tuple, List, Optional
from app.models.all_models import Order, OrderItem, OrderStatus, RecipeItem, Inventory
from app.repositories.order_repository import OrderRepository
from app.repositories.menu_repository import MenuRepository
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
import logging

logger = logging.getLogger(__name__)

TAX_RATE = 0.05  # 5% GST

class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrderRepository(db)
        self.menu_repo = MenuRepository(db)

    async def _deduct_inventory(self, items: List[OrderItem]):
        """Deducts ingredients from inventory based on order items."""
        for item in items:
            recipe_query = select(RecipeItem).where(RecipeItem.menu_item_id == item.menu_item_id)
            recipe_result = await self.db.execute(recipe_query)
            recipe_items = recipe_result.scalars().all()
            
            for recipe in recipe_items:
                inv_query = select(Inventory).where(Inventory.id == recipe.inventory_id)
                inv_result = await self.db.execute(inv_query)
                inv_item = inv_result.scalar_one_or_none()
                
                if inv_item:
                    deduct_qty = recipe.quantity_required * item.quantity
                    inv_item.quantity = max(0.0, inv_item.quantity - deduct_qty)
                    self.db.add(inv_item)
                    logger.info(f"Deducted {deduct_qty} {inv_item.unit} of {inv_item.ingredient_name} for menu item {item.menu_item_id}")

    async def _restore_inventory(self, items: List[OrderItem]):
        """Restores ingredients to inventory when an order is cancelled."""
        for item in items:
            recipe_query = select(RecipeItem).where(RecipeItem.menu_item_id == item.menu_item_id)
            recipe_result = await self.db.execute(recipe_query)
            recipe_items = recipe_result.scalars().all()
            
            for recipe in recipe_items:
                inv_query = select(Inventory).where(Inventory.id == recipe.inventory_id)
                inv_result = await self.db.execute(inv_query)
                inv_item = inv_result.scalar_one_or_none()
                
                if inv_item:
                    restore_qty = recipe.quantity_required * item.quantity
                    inv_item.quantity = inv_item.quantity + restore_qty
                    self.db.add(inv_item)
                    logger.info(f"Restored {restore_qty} {inv_item.unit} of {inv_item.ingredient_name} due to cancellation")

    async def create_order(self, user_id: int, data: OrderCreate) -> OrderResponse:
        subtotal = 0.0
        db_items = []

        # Process items to calculate total and verify availability
        for item_data in data.items:
            menu_item = await self.menu_repo.get_by_id(item_data.menu_item_id)
            if not menu_item:
                raise HTTPException(status_code=400, detail=f"Menu item ID {item_data.menu_item_id} not found.")
            if not menu_item.is_available:
                raise HTTPException(status_code=400, detail=f"Item '{menu_item.name}' is currently unavailable.")

            # Calculate price
            item_price = menu_item.price
            line_total = item_price * item_data.quantity
            subtotal += float(line_total)

            # Create OrderItem model
            db_item = OrderItem(
                menu_item_id=menu_item.id,
                quantity=item_data.quantity,
                unit_price=item_price,
                total_price=line_total,
                notes=item_data.notes
            )
            db_items.append(db_item)

        # Calculate final amounts
        subtotal_after_discount = max(0.0, subtotal - data.discount_amount)
        tax_amount = subtotal_after_discount * TAX_RATE
        total_amount = subtotal_after_discount + tax_amount

        # Create Order model
        order = Order(
            user_id=user_id,
            customer_id=data.customer_id,
            status=OrderStatus.PENDING,
            table_number=data.table_number,
            total_amount=total_amount,
            discount=data.discount_amount,
            tax=tax_amount,
            notes=data.notes
        )

        created_order = await self.repo.create_order(order, db_items)
        
        # Perform inventory deduction
        await self._deduct_inventory(db_items)
        await self.db.flush()
        
        logger.info(f"Created order ID: {created_order.id} for ₹{total_amount}")
        return OrderResponse.model_validate(created_order)

    async def get_order(self, order_id: int) -> OrderResponse:
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return OrderResponse.model_validate(order)

    async def get_all_orders(
        self, page: int, per_page: int, status: Optional[OrderStatus]
    ) -> Tuple[List[OrderResponse], int]:
        orders, total = await self.repo.get_all(page, per_page, status)
        return [OrderResponse.model_validate(o) for o in orders], total

    async def update_order_status(self, order_id: int, data: OrderUpdate) -> OrderResponse:
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
            
        old_status = order.status
        new_status = data.status
        
        updated = await self.repo.update_status(order_id, new_status, data.notes)
        
        # Handle stock modifications based on status changes
        if new_status == OrderStatus.CANCELLED and old_status != OrderStatus.CANCELLED:
            await self._restore_inventory(order.items)
            await self.db.flush()
        elif old_status == OrderStatus.CANCELLED and new_status != OrderStatus.CANCELLED:
            await self._deduct_inventory(order.items)
            await self.db.flush()
            
        return OrderResponse.model_validate(updated)
