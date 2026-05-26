process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.FRONTEND_URL ??= "http://localhost:5173";
