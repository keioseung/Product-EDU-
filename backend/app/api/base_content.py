from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
import logging
import traceback

from ..database import get_db
from ..models import BaseContent
from ..schemas import BaseContentCreate, BaseContentResponse

router = APIRouter()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[BaseContentResponse])
def get_all_base_contents(db: Session = Depends(get_db)):
    try:
        logger.info("Getting all base contents...")
        contents = db.query(BaseContent).order_by(BaseContent.created_at.desc()).all()
        logger.info(f"Found {len(contents)} base contents")
        
        # 각 항목의 데이터 타입 확인
        for i, content in enumerate(contents):
            logger.info(f"Content {i+1}: id={content.id}, title={content.title}, created_at={content.created_at} (type: {type(content.created_at)})")
        
        # 응답 직렬화 테스트
        try:
            response_data = []
            for content in contents:
                # created_at이 None인 경우 현재 시간으로 설정
                created_at = content.created_at
                if created_at is None:
                    from datetime import datetime
                    created_at = datetime.now()
                    logger.warning(f"Content {content.id} has None created_at, using current time")
                
                content_dict = {
                    "id": content.id,
                    "title": content.title,
                    "content": content.content,
                    "category": content.category,
                    "created_at": created_at
                }
                response_data.append(content_dict)
                logger.info(f"Serialized content {content.id} successfully")
            
            logger.info("All contents serialized successfully")
            return contents
        except Exception as serialize_error:
            logger.error(f"Serialization error: {serialize_error}")
            logger.error(f"Serialization traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Serialization error: {str(serialize_error)}")
            
    except Exception as e:
        logger.error(f"Error getting base contents: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get base contents: {str(e)}")

@router.options("/")
def options_base_content():
    return Response(status_code=200)

@router.post("/", response_model=BaseContentResponse)
def add_base_content(content_data: BaseContentCreate, db: Session = Depends(get_db)):
    try:
        from datetime import datetime
        
        logger.info(f"Adding base content: {content_data.title}")
        
        # 입력 데이터 검증
        if not content_data.title or not content_data.title.strip():
            raise HTTPException(status_code=400, detail="Title is required")
        
        if not content_data.content or not content_data.content.strip():
            raise HTTPException(status_code=400, detail="Content is required")
        
        if not content_data.category or not content_data.category.strip():
            content_data.category = "default"
        
        db_content = BaseContent(
            title=content_data.title.strip(),
            content=content_data.content.strip(),
            category=content_data.category.strip(),
            created_at=datetime.now()
        )
        db.add(db_content)
        db.commit()
        db.refresh(db_content)
        logger.info(f"Base content added successfully: {db_content.id}")
        return db_content
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding base content: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add base content: {str(e)}")

@router.put("/{content_id}", response_model=BaseContentResponse)
def update_base_content(content_id: int, content_data: BaseContentCreate, db: Session = Depends(get_db)):
    try:
        logger.info(f"Updating base content: {content_id}")
        content = db.query(BaseContent).filter(BaseContent.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Base content not found")
        
        content.title = content_data.title
        content.content = content_data.content
        content.category = content_data.category
        
        db.commit()
        db.refresh(content)
        logger.info(f"Base content updated successfully: {content_id}")
        return content
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating base content: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update base content: {str(e)}")

@router.delete("/{content_id}")
def delete_base_content(content_id: int, db: Session = Depends(get_db)):
    try:
        logger.info(f"Deleting base content: {content_id}")
        content = db.query(BaseContent).filter(BaseContent.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Base content not found")
        
        db.delete(content)
        db.commit()
        logger.info(f"Base content deleted successfully: {content_id}")
        return {"message": "Base content deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting base content: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete base content: {str(e)}")

@router.get("/category/{category}", response_model=List[BaseContentResponse])
def get_base_contents_by_category(category: str, db: Session = Depends(get_db)):
    try:
        logger.info(f"Getting base contents by category: {category}")
        contents = db.query(BaseContent).filter(BaseContent.category == category).all()
        logger.info(f"Found {len(contents)} base contents in category: {category}")
        return contents
    except Exception as e:
        logger.error(f"Error getting base contents by category: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get base contents by category: {str(e)}") 