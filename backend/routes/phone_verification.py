"""
Phone Verification Routes for FaceConnect
Handles SMS OTP verification using Twilio Verify API
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from datetime import datetime, timezone
import os
import re

router = APIRouter(prefix="/phone", tags=["phone-verification"])

# Twilio client - initialized lazily
_twilio_client = None

def get_twilio_client():
    """Get or create Twilio client"""
    global _twilio_client
    
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    
    if not account_sid or not auth_token:
        raise HTTPException(
            status_code=503,
            detail="SMS verification service not configured. Please contact support."
        )
    
    if _twilio_client is None:
        from twilio.rest import Client
        _twilio_client = Client(account_sid, auth_token)
    
    return _twilio_client

def get_verify_service_sid():
    """Get Twilio Verify Service SID"""
    service_sid = os.environ.get("TWILIO_VERIFY_SERVICE_SID")
    if not service_sid:
        raise HTTPException(
            status_code=503,
            detail="SMS verification service not configured"
        )
    return service_sid

# Pydantic models
class SendOTPRequest(BaseModel):
    phone_number: str
    
    @validator('phone_number')
    def validate_phone(cls, v):
        # Remove spaces and dashes
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        
        # Ensure it starts with + and country code
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        
        # Basic validation: should be at least 10 digits after +
        if len(cleaned) < 11 or not cleaned[1:].isdigit():
            raise ValueError('Invalid phone number format. Use international format: +1234567890')
        
        return cleaned

class VerifyOTPRequest(BaseModel):
    phone_number: str
    code: str
    
    @validator('phone_number')
    def validate_phone(cls, v):
        cleaned = re.sub(r'[\s\-\(\)]', '', v)
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        return cleaned
    
    @validator('code')
    def validate_code(cls, v):
        # OTP should be 4-8 digits
        if not v.isdigit() or len(v) < 4 or len(v) > 8:
            raise ValueError('Invalid verification code format')
        return v

class LinkPhoneRequest(BaseModel):
    phone_number: str
    code: str
    user_id: str

# Database reference (set by main app)
_db = None

def set_database(db):
    """Set database reference"""
    global _db
    _db = db

def get_db():
    """Get database reference"""
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db


@router.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    """
    Send OTP verification code via SMS
    Phone number should be in E.164 format: +[country code][number]
    Example: +1234567890
    """
    try:
        client = get_twilio_client()
        service_sid = get_verify_service_sid()
        
        # Send verification code
        verification = client.verify.v2.services(service_sid) \
            .verifications.create(to=request.phone_number, channel="sms")
        
        # Log the attempt (optional)
        db = get_db()
        await db.phone_verifications.insert_one({
            "phone_number": request.phone_number,
            "status": verification.status,
            "created_at": datetime.now(timezone.utc),
            "verified": False,
            "channel": "sms"
        })
        
        return {
            "success": True,
            "status": verification.status,
            "message": f"Verification code sent to {request.phone_number[-4:].rjust(len(request.phone_number), '*')}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        
        # Handle specific Twilio errors
        if "Invalid parameter" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Invalid phone number. Please use international format (e.g., +1234567890)"
            )
        elif "blocked" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Too many attempts. Please try again later."
            )
        else:
            print(f"[PhoneVerify] Send OTP error: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send verification code. Please try again."
            )


@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify the OTP code received via SMS
    """
    try:
        client = get_twilio_client()
        service_sid = get_verify_service_sid()
        
        # Check verification code
        verification_check = client.verify.v2.services(service_sid) \
            .verification_checks.create(to=request.phone_number, code=request.code)
        
        is_valid = verification_check.status == "approved"
        
        # Update database
        db = get_db()
        if is_valid:
            await db.phone_verifications.update_one(
                {"phone_number": request.phone_number, "verified": False},
                {"$set": {
                    "verified": True,
                    "verified_at": datetime.now(timezone.utc)
                }}
            )
        
        return {
            "success": is_valid,
            "valid": is_valid,
            "status": verification_check.status,
            "message": "Phone number verified successfully!" if is_valid else "Invalid verification code"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        
        if "Max check attempts" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Too many verification attempts. Please request a new code."
            )
        elif "not found" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Verification code expired. Please request a new code."
            )
        else:
            print(f"[PhoneVerify] Verify OTP error: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail="Verification failed. Please try again."
            )


@router.post("/link-to-account")
async def link_phone_to_account(request: LinkPhoneRequest, token: str = None):
    """
    Verify OTP and link phone number to user account
    """
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # First verify the OTP
    verify_result = await verify_otp(VerifyOTPRequest(
        phone_number=request.phone_number,
        code=request.code
    ))
    
    if not verify_result.get("valid"):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Link to user account
    try:
        db = get_db()
        
        # Check if phone is already linked to another account
        existing = await db.users.find_one({
            "phone_number": request.phone_number,
            "phone_verified": True
        })
        
        if existing and str(existing.get("_id")) != request.user_id:
            raise HTTPException(
                status_code=400,
                detail="This phone number is already linked to another account"
            )
        
        # Update user with verified phone
        result = await db.users.update_one(
            {"_id": request.user_id},
            {"$set": {
                "phone_number": request.phone_number,
                "phone_verified": True,
                "phone_verified_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "message": "Phone number verified and linked to your account"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PhoneVerify] Link error: {e}")
        raise HTTPException(status_code=500, detail="Failed to link phone number")


@router.get("/status")
async def check_phone_status(token: str = None):
    """
    Check if phone verification service is configured
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    service_sid = os.environ.get("TWILIO_VERIFY_SERVICE_SID")
    
    return {
        "configured": all([account_sid, auth_token, service_sid]),
        "account_sid_set": bool(account_sid),
        "auth_token_set": bool(auth_token),
        "verify_service_set": bool(service_sid),
        "instructions": {
            "step1": "Create a Twilio account at https://www.twilio.com",
            "step2": "Get Account SID and Auth Token from Console Dashboard",
            "step3": "Create a Verify Service in Console > Verify > Services",
            "step4": "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID to backend/.env"
        }
    }


# Export router
__all__ = ["router", "set_database"]
