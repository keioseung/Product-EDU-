from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
import logging
import traceback
import sys

from ..database import get_db
from ..models import Prompt
from ..schemas import PromptCreate, PromptResponse

router = APIRouter()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[PromptResponse])
def get_all_prompts(db: Session = Depends(get_db)):
    try:
        logger.info("Getting all prompts...")
        prompts = db.query(Prompt).order_by(Prompt.created_at.desc()).all()
        logger.info(f"Found {len(prompts)} prompts")
        
        # 각 항목의 데이터 타입 확인
        for i, prompt in enumerate(prompts):
            logger.info(f"Prompt {i+1}: id={prompt.id}, title={prompt.title}, created_at={prompt.created_at} (type: {type(prompt.created_at)})")
        
        # 응답 직렬화 테스트
        try:
            response_data = []
            for prompt in prompts:
                # created_at이 None인 경우 현재 시간으로 설정
                created_at = prompt.created_at
                if created_at is None:
                    from datetime import datetime
                    created_at = datetime.now()
                    logger.warning(f"Prompt {prompt.id} has None created_at, using current time")
                
                prompt_dict = {
                    "id": prompt.id,
                    "title": prompt.title,
                    "content": prompt.content,
                    "category": prompt.category,
                    "created_at": created_at
                }
                response_data.append(prompt_dict)
                logger.info(f"Serialized prompt {prompt.id} successfully")
            
            logger.info("All prompts serialized successfully")
            return prompts
        except Exception as serialize_error:
            logger.error(f"Serialization error: {serialize_error}")
            logger.error(f"Serialization traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Serialization error: {str(serialize_error)}")
            
    except Exception as e:
        logger.error(f"Error getting prompts: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get prompts: {str(e)}")

@router.post("/", response_model=PromptResponse)
def add_prompt(prompt_data: PromptCreate, db: Session = Depends(get_db)):
    try:
        from datetime import datetime
        
        logger.info(f"Adding prompt: {prompt_data}")
        logger.info(f"Title: {prompt_data.title}")
        logger.info(f"Content: {prompt_data.content}")
        logger.info(f"Category: {prompt_data.category}")
        
        # 입력 데이터 검증
        if not prompt_data.title or not prompt_data.title.strip():
            raise HTTPException(status_code=400, detail="Title is required")
        
        if not prompt_data.content or not prompt_data.content.strip():
            raise HTTPException(status_code=400, detail="Content is required")
        
        if not prompt_data.category or not prompt_data.category.strip():
            prompt_data.category = "default"
        
        # 데이터베이스 연결 확인
        try:
            db.execute("SELECT 1")
            logger.info("Database connection successful")
        except Exception as db_error:
            logger.error(f"Database connection failed: {db_error}")
            logger.error(f"Database error traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(db_error)}")
        
        # Prompt 객체 생성
        try:
            db_prompt = Prompt(
                title=prompt_data.title.strip(),
                content=prompt_data.content.strip(),
                category=prompt_data.category.strip(),
                created_at=datetime.now()
            )
            logger.info(f"Created Prompt object: {db_prompt}")
        except Exception as create_error:
            logger.error(f"Error creating Prompt object: {create_error}")
            logger.error(f"Create error traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Error creating Prompt object: {str(create_error)}")
        
        # 데이터베이스에 추가
        try:
            db.add(db_prompt)
            logger.info("Added prompt to session")
        except Exception as add_error:
            logger.error(f"Error adding prompt to session: {add_error}")
            logger.error(f"Add error traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Error adding prompt to session: {str(add_error)}")
        
        # 커밋
        try:
            db.commit()
            logger.info("Committed to database")
        except Exception as commit_error:
            logger.error(f"Error committing to database: {commit_error}")
            logger.error(f"Commit error traceback: {traceback.format_exc()}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error committing to database: {str(commit_error)}")
        
        # 새로고침
        try:
            db.refresh(db_prompt)
            logger.info(f"Prompt added successfully: {db_prompt.id}")
        except Exception as refresh_error:
            logger.error(f"Error refreshing prompt: {refresh_error}")
            # 새로고침 실패해도 ID는 있으므로 계속 진행
            pass
        
        return db_prompt
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error adding prompt: {e}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        try:
            db.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.put("/{prompt_id}", response_model=PromptResponse)
def update_prompt(prompt_id: int, prompt_data: PromptCreate, db: Session = Depends(get_db)):
    try:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        prompt.title = prompt_data.title
        prompt.content = prompt_data.content
        prompt.category = prompt_data.category
        
        db.commit()
        db.refresh(prompt)
        return prompt
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating prompt: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update prompt: {str(e)}")

@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    try:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        db.delete(prompt)
        db.commit()
        return {"message": "Prompt deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prompt: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete prompt: {str(e)}")

@router.get("/category/{category}", response_model=List[PromptResponse])
def get_prompts_by_category(category: str, db: Session = Depends(get_db)):
    try:
        prompts = db.query(Prompt).filter(Prompt.category == category).all()
        return prompts
    except Exception as e:
        logger.error(f"Error getting prompts by category: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get prompts by category: {str(e)}")

@router.get("/simple-test")
def simple_test():
    """간단한 테스트 엔드포인트"""
    return {"message": "Prompt API is working", "status": "ok", "timestamp": "2024-01-01T00:00:00Z"}

@router.get("/test")
def test_prompt_endpoint():
    """프롬프트 API 테스트 엔드포인트"""
    return {"message": "Prompt API is working", "status": "ok"}

@router.post("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    """데이터베이스 연결 테스트 엔드포인트"""
    try:
        # 간단한 쿼리 실행
        result = db.execute("SELECT 1 as test")
        return {"message": "Database connection successful", "test_result": result.scalar()}
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        logger.error(f"Database test traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database test failed: {str(e)}")

@router.options("/")
def options_prompt():
    return Response(status_code=200) 