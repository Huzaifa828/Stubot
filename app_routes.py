import sys
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.students.router import student_router
from modules.marks.router import marks_router
from auth.login_router import router as auth_router  
from modules.whatsapp.router import whatsapp_router
from scheduler import start_scheduler, stop_scheduler

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title='Student Agents for data Scrapping', version='0.1.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://stubot-ten.vercel.app",
    ],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=['*']
)

app.include_router(student_router)
app.include_router(marks_router)
app.include_router(auth_router)
app.include_router(whatsapp_router)


@app.get('/')
def health_check():
    return {"status": "running"}