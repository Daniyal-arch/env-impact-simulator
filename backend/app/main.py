from fastapi import FastAPI
from app.routers import simulate, nl
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",  # Vite frontend
    "http://localhost:3000",  # React default
    "http://127.0.0.1:3000",
]

app = FastAPI(
    title="Environmental Impact Simulator",
    description="Backend API for environmental impact simulations using GFW + Gemini/OpenAI LLMs",
    version="1.0.0",
)

# ✅ Add CORS middleware to this single app
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # or ["*"] for all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register routers
app.include_router(simulate.router)
app.include_router(nl.router)

@app.get("/")
def root():
    return {"message": "Welcome to the Environmental Impact Simulator API!"}
