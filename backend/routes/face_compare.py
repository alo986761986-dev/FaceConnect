"""
Face Comparison routes for FaceConnect.
Compare two photos to find matching/similar faces.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import base64
import json

from .shared import db, get_user_by_id

router = APIRouter(prefix="/face-compare", tags=["Face Comparison"])

# ============== MODELS ==============
class FaceComparisonRequest(BaseModel):
    image1_url: Optional[str] = None
    image1_base64: Optional[str] = None
    image2_url: Optional[str] = None
    image2_base64: Optional[str] = None
    descriptor1: Optional[List[float]] = None
    descriptor2: Optional[List[float]] = None

class FaceComparisonResult(BaseModel):
    match: bool
    similarity: float
    confidence: str  # "high", "medium", "low"
    details: dict
    comparison_id: str
    created_at: datetime

class ComparisonHistoryItem(BaseModel):
    id: str
    similarity: float
    match: bool
    confidence: str
    image1_thumbnail: Optional[str] = None
    image2_thumbnail: Optional[str] = None
    created_at: datetime

# ============== HELPER FUNCTIONS ==============
async def get_user_by_token(token: str) -> Optional[dict]:
    """Get user from session token."""
    session = await db.sessions.find_one({"token": token})
    if not session:
        return None
    return await get_user_by_id(session["user_id"])

def calculate_euclidean_distance(desc1: List[float], desc2: List[float]) -> float:
    """Calculate Euclidean distance between two face descriptors."""
    if len(desc1) != len(desc2):
        raise ValueError("Descriptors must have the same length")
    
    sum_squared = sum((a - b) ** 2 for a, b in zip(desc1, desc2))
    return sum_squared ** 0.5

def distance_to_similarity(distance: float) -> float:
    """Convert Euclidean distance to similarity percentage (0-100)."""
    # face-api.js uses threshold of ~0.6 for same person
    # Distance 0 = 100% similar, Distance 1+ = 0% similar
    similarity = max(0, min(100, (1 - distance) * 100))
    return round(similarity, 2)

def get_confidence_level(similarity: float) -> str:
    """Determine confidence level based on similarity."""
    if similarity >= 85:
        return "high"
    elif similarity >= 70:
        return "medium"
    else:
        return "low"

def is_match(similarity: float, threshold: float = 60.0) -> bool:
    """Determine if faces match based on similarity threshold."""
    return similarity >= threshold

# ============== ROUTES ==============
@router.post("/compare", response_model=FaceComparisonResult)
async def compare_faces(token: str, data: FaceComparisonRequest):
    """
    Compare two faces using their descriptors.
    
    The frontend extracts face descriptors using face-api.js and sends them here.
    This endpoint calculates the similarity between the two faces.
    """
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate that we have descriptors
    if not data.descriptor1 or not data.descriptor2:
        raise HTTPException(
            status_code=400, 
            detail="Face descriptors are required. Extract them using face-api.js on the frontend."
        )
    
    # Validate descriptor lengths (face-api.js uses 128-dimensional descriptors)
    if len(data.descriptor1) != 128 or len(data.descriptor2) != 128:
        raise HTTPException(
            status_code=400,
            detail="Invalid face descriptors. Expected 128-dimensional vectors."
        )
    
    # Calculate similarity
    try:
        distance = calculate_euclidean_distance(data.descriptor1, data.descriptor2)
        similarity = distance_to_similarity(distance)
        confidence = get_confidence_level(similarity)
        match = is_match(similarity)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error calculating similarity: {str(e)}")
    
    # Save comparison to history
    comparison_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    comparison_doc = {
        "id": comparison_id,
        "user_id": user["id"],
        "similarity": similarity,
        "distance": distance,
        "match": match,
        "confidence": confidence,
        "image1_url": data.image1_url,
        "image2_url": data.image2_url,
        "created_at": now.isoformat()
    }
    
    await db.face_comparisons.insert_one(comparison_doc)
    
    return FaceComparisonResult(
        match=match,
        similarity=similarity,
        confidence=confidence,
        details={
            "euclidean_distance": round(distance, 4),
            "threshold_used": 60.0,
            "descriptor_dimensions": 128,
            "algorithm": "face-api.js euclidean distance"
        },
        comparison_id=comparison_id,
        created_at=now
    )

@router.post("/compare-with-person")
async def compare_with_known_person(token: str, person_id: str, descriptor: List[float]):
    """
    Compare a face descriptor with a known person in the database.
    
    This allows comparing a new photo against someone already tracked in FaceConnect.
    """
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if len(descriptor) != 128:
        raise HTTPException(status_code=400, detail="Invalid face descriptor")
    
    # Get the person
    person = await db.persons.find_one({"id": person_id, "user_id": user["id"]}, {"_id": 0})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Get person's face descriptors
    person_descriptors = person.get("face_descriptors", [])
    if not person_descriptors:
        raise HTTPException(status_code=400, detail="Person has no face descriptors")
    
    # Compare with all person's descriptors and get best match
    best_similarity = 0
    best_distance = float('inf')
    
    for p_desc in person_descriptors:
        try:
            distance = calculate_euclidean_distance(descriptor, p_desc)
            similarity = distance_to_similarity(distance)
            if similarity > best_similarity:
                best_similarity = similarity
                best_distance = distance
        except:
            continue
    
    confidence = get_confidence_level(best_similarity)
    match = is_match(best_similarity)
    
    return {
        "person_id": person_id,
        "person_name": person.get("name"),
        "match": match,
        "similarity": best_similarity,
        "confidence": confidence,
        "details": {
            "euclidean_distance": round(best_distance, 4),
            "descriptors_compared": len(person_descriptors)
        }
    }

@router.get("/history", response_model=List[ComparisonHistoryItem])
async def get_comparison_history(token: str, limit: int = 20):
    """Get user's face comparison history"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    comparisons = await db.face_comparisons.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for comp in comparisons:
        created_at = comp.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(ComparisonHistoryItem(
            id=comp["id"],
            similarity=comp["similarity"],
            match=comp["match"],
            confidence=comp["confidence"],
            image1_thumbnail=comp.get("image1_url"),
            image2_thumbnail=comp.get("image2_url"),
            created_at=created_at
        ))
    
    return result

@router.delete("/history/{comparison_id}")
async def delete_comparison(comparison_id: str, token: str):
    """Delete a comparison from history"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.face_comparisons.delete_one({
        "id": comparison_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comparison not found")
    
    return {"success": True, "deleted": comparison_id}

@router.delete("/history")
async def clear_comparison_history(token: str):
    """Clear all comparison history"""
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await db.face_comparisons.delete_many({"user_id": user["id"]})
    
    return {"success": True, "deleted_count": result.deleted_count}

@router.get("/threshold-info")
async def get_threshold_info():
    """Get information about comparison thresholds"""
    return {
        "default_threshold": 60.0,
        "thresholds": {
            "strict": {"value": 75.0, "description": "High confidence match required"},
            "normal": {"value": 60.0, "description": "Standard matching (recommended)"},
            "loose": {"value": 45.0, "description": "More matches, lower confidence"}
        },
        "confidence_levels": {
            "high": {"min_similarity": 85, "description": "Very likely same person"},
            "medium": {"min_similarity": 70, "description": "Probably same person"},
            "low": {"min_similarity": 0, "description": "Uncertain match"}
        },
        "algorithm": "Euclidean distance on 128-dimensional face descriptors from face-api.js"
    }
