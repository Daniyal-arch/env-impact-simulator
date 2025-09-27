from fastapi import FastAPI
from app.routers import simulate, nl

app = FastAPI(
    title="Environmental Impact Simulator",
    description="Backend API for environmental impact simulations using GFW + Gemini/OpenAI LLMs",
    version="1.0.0",
)

app.include_router(simulate.router)
app.include_router(nl.router)

@app.get("/")
def root():
    return {"message": "Welcome to the Environmental Impact Simulator API!"}
