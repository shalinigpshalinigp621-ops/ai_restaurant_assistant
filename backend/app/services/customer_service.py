"""
Customer Service — Business logic for customer management.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Tuple, List, Optional
from app.models.all_models import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
import logging

logger = logging.getLogger(__name__)

class CustomerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CustomerRepository(db)

    async def create_customer(self, data: CustomerCreate) -> CustomerResponse:
        # Check if phone exists
        if data.phone:
            existing = await self.repo.get_by_phone(data.phone)
            if existing:
                raise HTTPException(status_code=400, detail="Customer with this phone number already exists.")
                
        customer = Customer(**data.model_dump())
        created = await self.repo.create(customer)
        logger.info(f"Created customer: {created.name}")
        return CustomerResponse.model_validate(created)

    async def get_customer(self, customer_id: int) -> CustomerResponse:
        customer = await self.repo.get_by_id(customer_id)
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        return CustomerResponse.model_validate(customer)

    async def get_all_customers(
        self, page: int, per_page: int, search: Optional[str]
    ) -> Tuple[List[CustomerResponse], int]:
        customers, total = await self.repo.get_all(page, per_page, search)
        return [CustomerResponse.model_validate(c) for c in customers], total

    async def update_customer(self, customer_id: int, data: CustomerUpdate) -> CustomerResponse:
        customer = await self.repo.get_by_id(customer_id)
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
        
        # Check if updating phone and it conflicts
        if data.phone and data.phone != customer.phone:
            existing = await self.repo.get_by_phone(data.phone)
            if existing:
                raise HTTPException(status_code=400, detail="Phone number already registered to another customer.")
                
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return CustomerResponse.model_validate(customer)
            
        updated = await self.repo.update(customer_id, **update_data)
        return CustomerResponse.model_validate(updated)

    async def delete_customer(self, customer_id: int) -> dict:
        customer = await self.repo.get_by_id(customer_id)
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
            
        await self.repo.delete(customer_id)
        logger.info(f"Deleted customer ID: {customer_id}")
        return {"message": "Customer deleted successfully", "success": True}
