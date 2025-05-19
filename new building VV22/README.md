# MedSearch

Welcome to **MedSearch**, your friendly companion for navigating drug safety. With this web application, you can explore side effects, discover drug interactions, and uncover essential research findings—all in one place.

---

## Feature Highlights

**Side Effect Explorer**
    Type the name of any medication into our search box and let MedSearch fetch potential adverse effects, combining FDA resources with our intelligent assistant.

**Interaction Checker**
    Input two or more drugs separated by commas; MedSearch will analyze possible interactions and present you with a concise summary.

**Research Finder**
    Search for keywords or drug names to retrieve recent PubMed article summaries, complete with publication dates and author lists.

**Secure User Access**
    Register an account or log in to access patient, researcher, or admin capabilities. Your session is protected by JWT tokens and bcrypt-hashed passwords.

---

## How It Works Under the Hood

1. **Backend** runs on FastAPI with Python 3.9+, using Motor to interact with MongoDB and HTTPX for external API calls.
2. **Data Storage** relies on MongoDB to hold user profiles, audit logs, and cached drug information for speedy lookups.
3. **Frontend** is crafted with plain HTML, CSS, and JavaScript, enhanced by Font Awesome icons—no heavy frameworks needed.
4. **AI & APIs** integrate OpenRouter’s LLM for name correction and LLM-driven summaries, alongside the NLM ClinicalTables and the FDA drug label endpoints.

---

## Getting Started

1. **Environment Preparation**

   * Ensure you have Python 3.9 or later installed.
   * MongoDB must be running locally or accessible through a connection URI.



## Important Note: If you are receiving this version of the build it means that the Backend Instalation is done ( you can skip step 2 and 3 and 4) ; you just need to install the required packages then run your dev environment ( python uvicorn main:app --reload )

2. **Backend Installation**

   * Open your terminal and create a virtual environment:

    *bash:
     python3 -m venv venv
     source venv/bin/activate
     
   * Install required packages:

    *bash:
     pip install -r requirements.txt
     
   * Rename `.env.example` to `.env` and set your configuration values:

    dotenv:
     SECRET_KEY=your_secret_key_here
     VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
     MONGODB_URI=mongodb://localhost:27017
     

3. **Serve Frontend Files**
   All static assets (HTML, CSS, JS, images) live under `static/`. The server automatically hosts them—no build step necessary.

4. **Launch the Application**

   * Start MongoDB if it isn’t already running:

    *bash:
     mongod --config /usr/local/etc/mongod.conf
  
   * Run the development server:

    *bash:
      python uvicorn main:app --reload
     
   * Open your browser at `http://localhost:8000` to begin.



## API Routes Overview

| Method | Endpoint                      | Description                                                    |
| -----: | :---------------------------- | :------------------------------------------------------------- |
|   POST | `/token`                      | Obtain JWT by sending `username` and `password`                |
|   POST | `/register`                   | Create a new user account                                      |
|    GET | `/users/me`                   | Retrieve current user information                              |
|    GET | `/api/pubmed?term             | Fetch up to 10 PubMed article summaries                        |
|   POST | `/api/side-effects`           | Supply `{ "med": "drug name" }` to get side effect details     |
|    GET | `/api/interactions            | Check for interactions between drugs a and b (comma-separated) |
|    GET | `/audit-logs`                 | Admins only: view audit log entries                            |

---




## Project Structure
---

project-root/
├── main.py            # FastAPI server and routing
├── auth.py            # Authentication utilities
├── database.py        # MongoDB connection and index setup
├── models.py          # Pydantic schemas for data validation
├── static/
│   ├── css/style.css  # Main stylesheet
│   ├── js/index.js    # Frontend logic for auth and UI updates
│   └── image/         # Illustrations and icons
└── requirements.txt   # Python dependencies list


---




### Environment Variables

| Variable                  | Purpose                                        |
| :------------------------ | :--------------------------------------------- |
| `SECRET_KEY`              | JWT signing key                                |
| `VITE_OPENROUTER_API_KEY` | Key for AI-powered name correction & Analysis  |
| `MONGODB_URI`             | MongoDB connection string                      |


