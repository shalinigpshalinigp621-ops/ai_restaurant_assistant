"""
Supplier Service — Business logic for supplier management.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Tuple, List, Optional
from app.models.all_models import Supplier
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
import logging

logger = logging.getLogger(__name__)


class SupplierService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SupplierRepository(db)

    async def create_supplier(self, data: SupplierCreate) -> SupplierResponse:
        supplier = Supplier(**data.model_dump())
        created = await self.repo.create(supplier)
        logger.info(f"Created supplier: {created.name}")
        return SupplierResponse.model_validate(created)

    async def get_supplier(self, supplier_id: int) -> SupplierResponse:
        s = await self.repo.get_by_id(supplier_id)
        if not s:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
            )
        return SupplierResponse.model_validate(s)

    async def get_all_suppliers(
        self, page: int, per_page: int, search: Optional[str], active_only: bool
    ) -> Tuple[List[SupplierResponse], int]:
        suppliers, total = await self.repo.get_all(page, per_page, search, active_only)
        return [SupplierResponse.model_validate(s) for s in suppliers], total

    async def update_supplier(
        self, supplier_id: int, data: SupplierUpdate
    ) -> SupplierResponse:
        s = await self.repo.get_by_id(supplier_id)
        if not s:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
            )
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return SupplierResponse.model_validate(s)
        updated = await self.repo.update(supplier_id, **update_data)
        return SupplierResponse.model_validate(updated)

    async def delete_supplier(self, supplier_id: int) -> dict:
        s = await self.repo.get_by_id(supplier_id)
        if not s:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
            )
        await self.repo.delete(supplier_id)
        logger.info(f"Deleted supplier ID: {supplier_id}")
        return {"message": "Supplier removed successfully", "success": True}
