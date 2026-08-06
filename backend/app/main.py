from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, workers, bins, tasks, firebase, routing  # ✅ Added routing
import app.firebase_config  # Import to trigger Firebase initialization

app = FastAPI(title="Smart Waste Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workers.router)
app.include_router(bins.router)
app.include_router(tasks.router)
app.include_router(firebase.router)
app.include_router(routing.router)  # ✅ Added routing router

@app.get("/")
def root():
    return {"message": "Smart Waste API is running"}

@app.on_event("startup")
async def startup_event(): 
    """Run on application startup"""
    print("🚀 Application starting...")