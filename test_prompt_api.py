import requests
import json

# API 기본 URL
BASE_URL = "http://localhost:8000/api"

def test_prompt_api():
    """프롬프트 API 테스트"""
    
    # 1. 테스트 엔드포인트 확인
    print("1. Testing prompt endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/prompt/test")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 2. 데이터베이스 연결 테스트
    print("\n2. Testing database connection...")
    try:
        response = requests.post(f"{BASE_URL}/prompt/test-db")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 3. 프롬프트 목록 조회
    print("\n3. Testing get prompts...")
    try:
        response = requests.get(f"{BASE_URL}/prompt/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # 4. 프롬프트 추가 테스트
    print("\n4. Testing add prompt...")
    test_prompt = {
        "title": "테스트 프롬프트",
        "content": "이것은 테스트 프롬프트입니다.",
        "category": "test"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/prompt/",
            json=test_prompt,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_prompt_api() 