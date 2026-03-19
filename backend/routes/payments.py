"""
Payment routes for FaceConnect.
Handles Stripe payments for subscriptions and one-time purchases (coins/credits).
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import os
import logging

# Try to import Stripe integration - may not be available in all deployments
try:
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionResponse, 
        CheckoutStatusResponse, 
        CheckoutSessionRequest
    )
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    StripeCheckout = None
    CheckoutSessionResponse = None
    CheckoutStatusResponse = None
    CheckoutSessionRequest = None

from .shared import db

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)

# Fixed pricing packages - NEVER accept amounts from frontend
SUBSCRIPTION_PLANS = {
    "premium_monthly": {
        "name": "Premium Monthly",
        "amount": 9.99,
        "currency": "usd",
        "type": "subscription",
        "features": ["Unlimited posts", "HD video uploads", "Priority support", "No ads", "Analytics"]
    },
    "premium_yearly": {
        "name": "Premium Yearly",
        "amount": 99.99,
        "currency": "usd",
        "type": "subscription",
        "features": ["All Premium features", "2 months free", "Early access to features"]
    }
}

COIN_PACKAGES = {
    "coins_100": {
        "name": "100 Coins",
        "amount": 0.99,
        "currency": "usd",
        "coins": 100,
        "type": "one_time"
    },
    "coins_500": {
        "name": "500 Coins",
        "amount": 4.99,
        "currency": "usd",
        "coins": 500,
        "bonus": 50,
        "type": "one_time"
    },
    "coins_1000": {
        "name": "1000 Coins",
        "amount": 9.99,
        "currency": "usd",
        "coins": 1000,
        "bonus": 150,
        "type": "one_time"
    },
    "coins_5000": {
        "name": "5000 Coins",
        "amount": 49.99,
        "currency": "usd",
        "coins": 5000,
        "bonus": 1000,
        "type": "one_time"
    }
}

# Request/Response models
class CreateCheckoutRequest(BaseModel):
    package_id: str = Field(..., description="The package ID to purchase")
    origin_url: str = Field(..., description="Frontend origin URL for redirects")
    user_id: Optional[str] = Field(None, description="User ID for authenticated purchases")

class CheckoutResponse(BaseModel):
    url: str
    session_id: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    amount_total: float
    currency: str
    package_id: str
    coins_awarded: Optional[int] = None

# Helper to get Stripe checkout instance
def get_stripe_checkout(request: Request):
    if not STRIPE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Payment service not available")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)

@router.get("/packages")
async def get_packages():
    """Get all available packages (subscriptions and coins)."""
    return {
        "subscriptions": SUBSCRIPTION_PLANS,
        "coins": COIN_PACKAGES
    }

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    checkout_request: CreateCheckoutRequest,
    request: Request
):
    """Create a Stripe checkout session for a package."""
    package_id = checkout_request.package_id
    origin_url = checkout_request.origin_url.rstrip('/')
    user_id = checkout_request.user_id
    
    # Find the package
    package = None
    package_type = None
    
    if package_id in SUBSCRIPTION_PLANS:
        package = SUBSCRIPTION_PLANS[package_id]
        package_type = "subscription"
    elif package_id in COIN_PACKAGES:
        package = COIN_PACKAGES[package_id]
        package_type = "coins"
    
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package ID")
    
    # Build URLs from provided origin
    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment/cancel"
    
    # Metadata for tracking
    metadata = {
        "package_id": package_id,
        "package_type": package_type,
        "user_id": user_id or "anonymous"
    }
    
    if package_type == "coins":
        metadata["coins"] = str(package.get("coins", 0))
        metadata["bonus"] = str(package.get("bonus", 0))
    
    try:
        stripe_checkout = get_stripe_checkout(request)
        
        checkout_req = CheckoutSessionRequest(
            amount=float(package["amount"]),
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
        
        # Create payment transaction record BEFORE redirect
        transaction = {
            "session_id": session.session_id,
            "user_id": user_id,
            "package_id": package_id,
            "package_type": package_type,
            "amount": package["amount"],
            "currency": package["currency"],
            "status": "initiated",
            "payment_status": "pending",
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.payment_transactions.insert_one(transaction)
        
        return CheckoutResponse(url=session.url, session_id=session.session_id)
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@router.get("/status/{session_id}", response_model=PaymentStatusResponse)
async def get_payment_status(session_id: str, request: Request):
    """Get the status of a payment session and update user's coins if successful."""
    try:
        stripe_checkout = get_stripe_checkout(request)
        
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Get transaction from database
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Check if already processed to avoid duplicate credit
        already_processed = transaction.get("processed", False)
        
        coins_awarded = None
        
        # Update transaction status
        update_data = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        # If payment successful and not already processed, award coins/subscription
        if status.payment_status == "paid" and not already_processed:
            update_data["processed"] = True
            
            package_type = transaction.get("package_type")
            user_id = transaction.get("user_id")
            
            if package_type == "coins" and user_id and user_id != "anonymous":
                package_id = transaction.get("package_id")
                package = COIN_PACKAGES.get(package_id, {})
                coins = package.get("coins", 0) + package.get("bonus", 0)
                coins_awarded = coins
                
                # Add coins to user
                await db.users.update_one(
                    {"id": user_id},
                    {
                        "$inc": {"coins": coins},
                        "$set": {"updated_at": datetime.now(timezone.utc)}
                    }
                )
                
                # Record coin transaction
                await db.coin_transactions.insert_one({
                    "user_id": user_id,
                    "amount": coins,
                    "type": "purchase",
                    "payment_session_id": session_id,
                    "created_at": datetime.now(timezone.utc)
                })
                
            elif package_type == "subscription" and user_id and user_id != "anonymous":
                package_id = transaction.get("package_id")
                
                # Update user subscription
                subscription_end = datetime.now(timezone.utc)
                if "yearly" in package_id:
                    from datetime import timedelta
                    subscription_end = subscription_end + timedelta(days=365)
                else:
                    from datetime import timedelta
                    subscription_end = subscription_end + timedelta(days=30)
                
                await db.users.update_one(
                    {"id": user_id},
                    {
                        "$set": {
                            "is_premium": True,
                            "subscription_plan": package_id,
                            "subscription_start": datetime.now(timezone.utc),
                            "subscription_end": subscription_end,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        return PaymentStatusResponse(
            status=status.status,
            payment_status=status.payment_status,
            amount_total=status.amount_total / 100,  # Convert from cents
            currency=status.currency,
            package_id=transaction.get("package_id", ""),
            coins_awarded=coins_awarded
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")

@router.get("/history/{user_id}")
async def get_payment_history(user_id: str):
    """Get payment history for a user."""
    transactions = await db.payment_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"transactions": transactions}

@router.get("/balance/{user_id}")
async def get_user_balance(user_id: str):
    """Get user's coin balance and subscription status."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "coins": 1, "is_premium": 1, "subscription_plan": 1, "subscription_end": 1})
    
    if not user:
        return {"coins": 0, "is_premium": False, "subscription_plan": None}
    
    return {
        "coins": user.get("coins", 0),
        "is_premium": user.get("is_premium", False),
        "subscription_plan": user.get("subscription_plan"),
        "subscription_end": user.get("subscription_end")
    }
