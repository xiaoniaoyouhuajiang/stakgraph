from fastapi import FastAPI 
from . import routes
from .db import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Python Test Example StakGraph",
    description="A simple Treesitter test example for Python"
)

app.include_router(routes.router)

@app.get("/")
def root():
    return {"message": "Welcome to StakGraph Python Example"}

    