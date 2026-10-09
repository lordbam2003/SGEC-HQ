import uvicorn
from backend.app.config import APP_HOST, APP_PORT

if __name__ == "__main__":
    print(f"Iniciando Sistema de Costeo Hospitalario en http://localhost:{APP_PORT}")
    uvicorn.run("backend.app.main:app", host=APP_HOST, port=APP_PORT, reload=True)
