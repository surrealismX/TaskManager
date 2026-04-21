from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Finance
from ..schemas import FinanceCreate, FinanceResponse
from ..auth import get_current_user

router = APIRouter(
    prefix="/finance",
    tags=["Finance"]
)

@router.get("/ping")
def ping():
    return {"message": "Finance router is working"}

# CREATE
@router.post("/", response_model=FinanceResponse)
def create_finance(
    finance: FinanceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    new_finance = Finance(
        user_id=current_user.id,
        amount=finance.amount,
        type=finance.type,
        description=finance.description
    )
    db.add(new_finance)
    db.commit()
    db.refresh(new_finance)
    return new_finance

# READ ALL
@router.get("/", response_model=list[FinanceResponse])
def list_finances(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Finance).filter(Finance.user_id == current_user.id).all()

# READ ONE
@router.get("/{finance_id}", response_model=FinanceResponse)
def get_finance(
    finance_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    finance = db.query(Finance).filter(
        Finance.id == finance_id,
        Finance.user_id == current_user.id
    ).first()

    if not finance:
        raise HTTPException(status_code=404, detail="Finance record not found")

    return finance

# UPDATE
@router.put("/{finance_id}", response_model=FinanceResponse)
def update_finance(
    finance_id: int,
    updated: FinanceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    finance = db.query(Finance).filter(
        Finance.id == finance_id,
        Finance.user_id == current_user.id
    ).first()

    if not finance:
        raise HTTPException(status_code=404, detail="Finance record not found")

    finance.amount = updated.amount
    finance.type = updated.type
    finance.description = updated.description

    db.commit()
    db.refresh(finance)
    return finance

# DELETE
@router.delete("/{finance_id}")
def delete_finance(
    finance_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    finance = db.query(Finance).filter(
        Finance.id == finance_id,
        Finance.user_id == current_user.id
    ).first()

    if not finance:
        raise HTTPException(status_code=404, detail="Finance record not found")

    db.delete(finance)
    db.commit()
    return {"message": "Finance record deleted"}
