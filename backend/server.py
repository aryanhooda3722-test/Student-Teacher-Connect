from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str  # "teacher" or "student"
    profile_photo: Optional[str] = None
    theme_preference: str = "light"  # "light" or "dark"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_photo: Optional[str] = None
    theme_preference: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Assignment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    subject: str
    deadline: datetime
    teacher_id: str
    teacher_name: str
    assigned_students: List[str] = []  # List of student IDs assigned to this assignment
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssignmentCreate(BaseModel):
    title: str
    description: str
    subject: str
    deadline: datetime
    assigned_students: List[str] = []  # Optional list of student IDs to assign

class AssignmentSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assignment_id: str
    student_id: str
    student_name: str
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Helper function to prepare data for MongoDB
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str) and key in ['created_at', 'deadline', 'completed_at']:
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
    return item

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user = User(
        name=user_data.name,
        email=user_data.email,
        role=user_data.role
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    user_dict = prepare_for_mongo(user_dict)
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user_data = await db.users.find_one({"email": user_credentials.email})
    if not user_data or not verify_password(user_credentials.password, user_data["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user_data = parse_from_mongo(user_data)
    user = User(**{k: v for k, v in user_data.items() if k != "password"})
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user}

# User Profile Routes
@api_router.get("/users/me", response_model=User)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/users/me", response_model=User)
async def update_profile(user_update: UserUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_data}
        )
        
        # Get updated user
        updated_user_data = await db.users.find_one({"id": current_user.id})
        updated_user_data = parse_from_mongo(updated_user_data)
        return User(**{k: v for k, v in updated_user_data.items() if k != "password"})
    
    return current_user

# Assignment Routes
@api_router.post("/assignments", response_model=Assignment)
async def create_assignment(assignment_data: AssignmentCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    assignment = Assignment(
        title=assignment_data.title,
        description=assignment_data.description,
        subject=assignment_data.subject,
        deadline=assignment_data.deadline,
        teacher_id=current_user.id,
        teacher_name=current_user.name,
        assigned_students=assignment_data.assigned_students
    )
    
    assignment_dict = prepare_for_mongo(assignment.dict())
    await db.assignments.insert_one(assignment_dict)
    
    return assignment

@api_router.get("/assignments", response_model=List[Assignment])
async def get_all_assignments(current_user: User = Depends(get_current_user)):
    """Get all assignments for both teachers and students"""
    assignments_data = await db.assignments.find().to_list(1000)
    assignments = []
    for assignment_data in assignments_data:
        assignment_data = parse_from_mongo(assignment_data)
        assignments.append(Assignment(**assignment_data))
    return assignments

@api_router.get("/assignments/my", response_model=List[Assignment])
async def get_my_assignments(current_user: User = Depends(get_current_user)):
    """Get user's specific assignments - teacher's created assignments or student's assigned assignments"""
    if current_user.role == "teacher":
        # Teachers see assignments they created
        assignments_data = await db.assignments.find({"teacher_id": current_user.id}).to_list(1000)
    else:
        # Students see assignments they are specifically assigned to
        assignments_data = await db.assignments.find({"assigned_students": current_user.id}).to_list(1000)
    
    assignments = []
    for assignment_data in assignments_data:
        assignment_data = parse_from_mongo(assignment_data)
        assignments.append(Assignment(**assignment_data))
    return assignments

# Get all students (for assignment creation)
@api_router.get("/users/students", response_model=List[User])
async def get_all_students(current_user: User = Depends(get_current_user)):
    """Get all students for assignment creation"""
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view student list")
    
    students_data = await db.users.find({"role": "student"}).to_list(1000)
    students = []
    for student_data in students_data:
        student_data = parse_from_mongo(student_data)
        students.append(User(**{k: v for k, v in student_data.items() if k != "password"}))
    return students

# Assignment Submission Routes
@api_router.post("/assignments/{assignment_id}/complete")
async def complete_assignment(assignment_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can complete assignments")
    
    # Check if assignment exists
    assignment = await db.assignments.find_one({"id": assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check if student is assigned to this assignment
    if current_user.id not in assignment.get("assigned_students", []):
        raise HTTPException(status_code=403, detail="You are not assigned to this assignment")
    
    # Check if already completed
    existing_submission = await db.submissions.find_one({
        "assignment_id": assignment_id,
        "student_id": current_user.id
    })
    if existing_submission:
        raise HTTPException(status_code=400, detail="Assignment already completed")
    
    # Create submission
    submission = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        student_name=current_user.name
    )
    
    submission_dict = prepare_for_mongo(submission.dict())
    await db.submissions.insert_one(submission_dict)
    
    return {"message": "Assignment marked as completed successfully"}

@api_router.get("/assignments/{assignment_id}/submissions")
async def get_assignment_submissions(assignment_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view submissions")
    
    submissions_data = await db.submissions.find({"assignment_id": assignment_id}).to_list(1000)
    submissions = []
    for submission_data in submissions_data:
        submission_data = parse_from_mongo(submission_data)
        submissions.append(AssignmentSubmission(**submission_data))
    return submissions

@api_router.get("/submissions/my")
async def get_my_submissions(current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their submissions")
    
    submissions_data = await db.submissions.find({"student_id": current_user.id}).to_list(1000)
    completed_assignment_ids = [sub["assignment_id"] for sub in submissions_data]
    return {"completed_assignments": completed_assignment_ids}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()