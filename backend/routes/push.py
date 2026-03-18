"""
Push Notifications routes for FaceConnect.
Handles VAPID configuration, subscriptions, and sending notifications.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path

from .shared import db, get_current_user

router = APIRouter(prefix="/push", tags=["Push Notifications"])

# VAPID configuration
ROOT_DIR = Path(__file__).parent.parent
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY_FILE = ROOT_DIR / os.environ.get('VAPID_PRIVATE_KEY_FILE', 'vapid_private.pem')
VAPID_CONTACT = os.environ.get('VAPID_CONTACT', 'mailto:admin@faceconnect.app')

# Load VAPID instance
vapid_instance = None
try:
    from pywebpush import webpush, WebPushException
    from py_vapid import Vapid
    if VAPID_PRIVATE_KEY_FILE.exists():
        vapid_instance = Vapid.from_file(str(VAPID_PRIVATE_KEY_FILE))
        logging.info("VAPID keys loaded successfully in push module")
except Exception as e:
    logging.warning(f"VAPID not available: {e}")


# ============== MODELS ==============
class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]


class PushSubscriptionCreate(BaseModel):
    subscription: PushSubscription


# ============== ROUTES ==============
@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Get the VAPID public key for push notification subscription."""
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe_push(token: str, data: PushSubscriptionCreate):
    """Subscribe to push notifications."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    subscription_info = {
        "endpoint": data.subscription.endpoint,
        "keys": data.subscription.keys
    }
    
    # Store subscription in database (upsert)
    await db.push_subscriptions.update_one(
        {"user_id": user['id'], "endpoint": data.subscription.endpoint},
        {
            "$set": {
                "user_id": user['id'],
                "subscription": subscription_info,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Subscribed to push notifications"}


@router.delete("/unsubscribe")
async def unsubscribe_push(token: str, endpoint: str):
    """Unsubscribe from push notifications."""
    user = await get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    await db.push_subscriptions.delete_one({
        "user_id": user['id'],
        "endpoint": endpoint
    })
    
    return {"message": "Unsubscribed from push notifications"}


# ============== HELPER FUNCTION ==============
async def send_push_notification(user_id: str, title: str, body: str, data: Optional[dict] = None):
    """Send push notification to a user's subscribed devices.
    
    This function can be imported and used by other modules.
    """
    if not vapid_instance:
        logging.warning("VAPID not configured, skipping push notification")
        return
    
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logging.warning("pywebpush not available")
        return
    
    subscriptions = await db.push_subscriptions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    for sub in subscriptions:
        try:
            subscription_info = sub['subscription']
            payload = json.dumps({
                "title": title,
                "body": body,
                "icon": "/icons/icon-192x192.png",
                "badge": "/icons/icon-72x72.png",
                "data": data or {}
            })
            
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=str(VAPID_PRIVATE_KEY_FILE),
                vapid_claims={
                    "sub": VAPID_CONTACT
                }
            )
            logging.info(f"Push notification sent to user {user_id}")
        except WebPushException as e:
            logging.error(f"Push notification failed: {e}")
            # If subscription is invalid, remove it
            if e.response and e.response.status_code in [404, 410]:
                await db.push_subscriptions.delete_one({
                    "user_id": user_id,
                    "endpoint": subscription_info['endpoint']
                })
        except Exception as e:
            logging.error(f"Push notification error: {e}")


# Export helper for other modules
__all__ = ["router", "send_push_notification"]
