# Transportation-Problem

Backend (FastAPI)
cd backend

python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install fastapi uvicorn ortools pydantic

uvicorn main:app --reload
🌐 Frontend (React + Vite)
cd frontend

npm install

npm run dev

👉 Frontend runs at:
http://localhost:5173
