# main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.database import Base, engine
from app import models
from app.routers import users, projects, tasks, finance

app = FastAPI(title="Task Manager API")

# CORS for frontend dev server (Vite) and for local usage
origins_env = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
)
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Root endpoint
@app.get("/")
def root():
    return {"message": "Task Manager API is running"}

# Include routers
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(finance.router)