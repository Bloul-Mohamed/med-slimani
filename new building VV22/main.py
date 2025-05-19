import os  # to load env
import asyncio  # async ops
from datetime import datetime, timedelta  # time utils
from enum import Enum  # role types
from typing import Optional, List, Dict  # typing hints

from dotenv import load_dotenv  # env loader
load_dotenv()  # init 

from fastapi import FastAPI, Depends, HTTPException, Body  # web framework
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm  # auth
from fastapi.responses import FileResponse, RedirectResponse  # responses
from fastapi.staticfiles import StaticFiles  # serve files
from fastapi.middleware.cors import CORSMiddleware  # cors

from pydantic import BaseModel  # data models
from passlib.context import CryptContext  # password hash
import httpx  # http client
import logging  # logger

from auth import authenticate_user, get_current_user, create_access_token  # auth funcs
from database import database  # db client
from models import UserCreate # user schemas
#For formatting : 
from typing import Optional, List, Dict, Any 



import re # REGEX
            
            
            # configuring logging
logging.basicConfig(level=logging.DEBUG)  # debug logs
logger = logging.getLogger(__name__)  # get logger

# create app
app = FastAPI()  # api app
app.add_middleware(  # cors setup
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],  # frontend origin
    allow_credentials=True,  # allow creds
     # all methods and headers
    allow_methods=["*"], 
    allow_headers=["*"],
)
    
    # root path
@app.get("/")  
async def read_index():
    return RedirectResponse(url="/static/index.html")  # redirect home

app.mount("/static", StaticFiles(directory="static"), name="static")  # serve static

    # security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # hashing
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  # token login

SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(32).hex())  # jwt key
ALGORITHM = "HS256"  
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # token expiry

    # user roles
class Role(str, Enum):  
    PATIENT = "patient"
    RESEARCHER = "researcher"
    ADMIN = "admin"



    # user model
class User(BaseModel):  
    username: str
    email: str
    role: Role
    disabled: bool = False


    # db user
class UserInDB(User):  
    hashed_password: str

    # autocorrect helper
OPENROUTER_KEY = os.getenv("VITE_OPENROUTER_API_KEY")  # ai key
if not OPENROUTER_KEY:
    raise RuntimeError("Missing VITE_OPENROUTER_API_KEY env var.")  # stop if no key






# lookup drug
async def nlm_autocomplete(name: str) -> Optional[str]:  
    url = "https://clinicaltables.nlm.nih.gov/api/rxterms/v1/search"
    params = {"terms": name, "df": "DISPLAY_NAME", "autocomp": 1}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=5.0)
    if not resp.is_success:
        # it means no suggestions
        return None  
    suggestions = resp.json()[1]
    if not suggestions:
        return None
    # pick name
    return suggestions[0].split(" (", 1)[0].strip()  



    # correct name
async def correct_med_name(raw: str) -> str:  
    nlm = await nlm_autocomplete(raw)
    if nlm:
        logger.debug(f"NLM autocomp '{raw}' → '{nlm}'")
        # use nlm
        return nlm  

    prompt = (
        f"Correct any typos in this drug name and return ONLY the corrected name: {raw}"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "Content-Type": "application/json",
            },
            json={"model": "deepseek/deepseek-chat", "messages": [{"role": "user", "content": prompt}], "max_tokens": 8},
            timeout=15.0,
        )
    resp.raise_for_status()
    text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    corrected = text.strip('"“”‘’') or raw  # fallback
    logger.debug(f"AI autocomp '{raw}' → '{corrected}'")
    return corrected

                # auth routes
@app.post("/token")  # login
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = await authenticate_user(form_data.username, form_data.password)  # auth
        if not user:
            raise HTTPException(status_code=401, detail="Incorrect username or password")  # bad creds
        await database.get_users_collection().update_one({"username": user.username}, {"$set": {"last_login": datetime.utcnow()}})  # update login
        token = create_access_token(data={"sub": user.username})  # create token
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in /token")
        raise HTTPException(status_code=500, detail="Internal authentication error")

                # test user
async def create_test_user():
    users = database.get_users_collection()
    existing = await users.find_one({"username": "admin"})
    if not existing:
        await users.insert_one({"username": "admin", "email": "admin@example.com", "role": Role.ADMIN.value, "hashed_password": pwd_context.hash("admin123"), "disabled": False})



# init
@app.on_event("startup")  
async def on_startup():
    # connect db
    await database.connect()  
    await create_test_user()  # add admin

@app.on_event("shutdown")  # cleanup
async def on_shutdown():
    await database.close()  # close db

# user info
@app.get("/users/me")  # current user
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user  # return user



# admin logs
@app.get("/audit-logs")  
async def get_audit_logs(current_user: User = Depends(get_current_user)):
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden")                         # forbid
    logs = await database.get_audit_collection().find().to_list(100)
    return logs

@app.post("/register")  # signup
async def register(user: UserCreate):
    coll = database.get_users_collection()
    if await coll.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed = pwd_context.hash(user.password)
    now = datetime.utcnow()
    await coll.insert_one({"username": user.username, "email": user.email, "role": user.role, "hashed_password": hashed, "disabled": False, "created_at": now, "last_login": now})
    return {"message": "User created successfully"}

# pubmed proxy
PUBMED_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" 
PUBMED_ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
FDA_DRUG_LABEL_URL = "https://api.fda.gov/drug/label.json"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"



 # search articles
@app.get("/api/pubmed") 
async def proxy_pubmed(term: str):
    params = {"db": "pubmed", "term": term, "retmode": "json", "retmax": "10"}
    async with httpx.AsyncClient() as client:
        esearch_resp = await client.get(PUBMED_ESEARCH_URL, params=params)
        ids = esearch_resp.json()["esearchresult"]["idlist"]
        if not ids:
            return []
        summary_params = {"db": "pubmed", "id": ",".join(ids), "retmode": "json"}
        esummary_resp = await client.get(PUBMED_ESUMMARY_URL, params=summary_params)
        result = esummary_resp.json()["result"]
        summaries = [
            {"pmid": k, "title": v.get("title"), "authors": [au["name"] for au in v.get("authors", [])], "pubdate": v.get("pubdate")} for k, v in result.items() if k != "uids"
        ]
        return summaries



            # cacher
from functools import lru_cache

@lru_cache(maxsize=128)
def cached_interaction(drug: str):  # fda cache
    response = httpx.get(FDA_DRUG_LABEL_URL, params={"search": f"openfda.generic_name:{drug}", "limit": 1})
    if response.status_code != 200:
        return None
    data = response.json()
    interactions = data.get("results", [{}])[0].get("drug_interactions", [])
    return {"drug": drug, "interactions": interactions}




        # drug interaction funct
@app.get("/api/interactions")  
def get_interactions(drugs: str):
    drug_list = [d.strip() for d in drugs.split(",")]
    result = {}
    for drug in drug_list:
        cached = cached_interaction(drug)
        if cached:
            result[drug] = cached["interactions"]
    return result

                    
                    
                    
                    
                    # side effects
class SideEffectsRequest(BaseModel):  # input model
    med: str

class SideEffectsResponse(BaseModel):  # output model
    reply: str

@app.post("/api/side-effects", response_model=SideEffectsResponse)  # side effects
async def side_effects(med_req: SideEffectsRequest = Body(...)):
    raw = med_req.med.strip()
    if not raw:
        raise HTTPException(status_code=400, detail="`med` is required")

    try:
        med = await correct_med_name(raw)  # correct name
        logger.debug(f"Autocorrect '{raw}' → '{med}'")

        async def fetch_reply(drug_name: str) -> Optional[str]:
            messages = [
                {"role":"system", "content": (
                    "You are a highly knowledgeable pharmacology assistant."              )},
                {"role":"user", "content": (
                    f"Please gather the side effects of “{drug_name}”."                )}
            ]
            try:
                async with httpx.AsyncClient() as client:
                
#prov-begin
                    resp = await client.post(
                    OPENROUTER_URL,
                    headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type": "application/json"
                     },
                    json={
                     "model": "deepseek/deepseek-chat",
                     "messages": messages,
                     "max_tokens": 1600,
                     "temperature": 0.2
                     },
                     timeout=60.0,
                     )

                    data = resp.json()
                    if resp.status_code != 200 or data.get("error"):
                        logger.error(f"[OpenRouter Error] {resp.status_code} → {data}")
                        return None

# at this point we know we have a valid choices array


#prov-end
                choices = data.get("choices", [])
                if not choices:
                    return None
                return choices[0]["message"]["content"]  # return text
            except Exception:
                logger.exception(f"LLM call failed for '{drug_name}'")
                return None

        reply = await fetch_reply(med) or await fetch_reply(raw)  # get reply
        used  = med if reply else raw

        if not reply:
            return {"reply": f"<p>No safety info found for <strong>{used}</strong>.</p>"}

        
        body = re.sub(r'^(🔍.*\n+|#+\s*[^\n]+\n+)+', '', reply.lstrip())  # clean lead

        header = (
            '<div class="query-header">'            f'🔍 Queried drug name: <strong>{used}</strong>'            '</div><hr/>'
        )
        return {"reply": header + body}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error in /api/side-effects")
        return {"reply": "<p><strong>Error:</strong> please try later.</p>"}







#crossintr endpoint
@app.post("/api/format-interactions")
async def format_interactions(payload: Dict[str, Any] = Body(...)):
    try:    
        raw_text = payload.get("text", "")
       # prompt = (
        #    "Please take the following raw drug-interaction description and:\n"
         #   "1. Split into clear sections with <h3> subheadings.\n"
          #  "2. Convert lists into <ul><li> bullet points.\n"
           # "3. Provide a one-sentence summary at top.\n"
            #"4. Return ONLY valid HTML suitable for a <div>.\n"
           # f"Raw text:\n\"\"\"{raw_text}\"\"\""
        #)
        prompt = (
        "Please take the following raw drug-interaction description and:\n"
        "1. Summarize it in one sentence at the top.\n"
        "2. Split into clear sections with <h3> subheadings.\n"
        "3. Use <ul><li> for lists and <p> for paragraphs.\n"
        "4. Avoid using <pre> or <code>.\n"
        "5. Return ONLY valid HTML suitable for a <div>.\n"
        f"Raw text:\n\"\"\"{raw_text}\"\"\""
            )

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek/deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1400
                }
            )

        data = resp.json()
        if data.get("error"):
            raise HTTPException(status_code=502, detail=data["error"]["message"])

        content = data["choices"][0]["message"]["content"]
        html = re.sub(r"^```[a-z]*\s*|```$", "", content, flags=re.I).strip()
        return {"html": html}
    
    
    except Exception as ex:
        logger.exception("Error in /api/format-interactions")
        raise HTTPException(status_code=500, detail=str(ex))

#end


