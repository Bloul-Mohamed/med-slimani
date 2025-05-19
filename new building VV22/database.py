
from motor.motor_asyncio import AsyncIOMotorClient

class Database:
    def __init__(self):
        self.client = None
        self.db = None

    async def connect(self):
        self.client = AsyncIOMotorClient("mongodb://localhost:27017")
        self.db = self.client.med_research
        await self.create_indexes()
        return self

    async def create_indexes(self):
        # Audit logs  
        await self.db.audit_logs.create_index(
            "timestamp",
            expireAfterSeconds=2592000
        )
        # Users unique index on username
        await self.db.users.create_index(
            "username",
            unique=True
        )
                # auto-delete users after 30 days of inactivity
        await self.db.users.create_index(
           "last_login",
            expireAfterSeconds=2592000
           )
        

    async def close(self):
        if self.client:
            self.client.close()

    def get_users_collection(self):
        return self.db.users

    def get_audit_collection(self):
        return self.db.audit_logs

   

# Singleton instance
database = Database()

