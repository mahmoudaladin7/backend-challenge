const request = require("supertest");
const app = require("../app"); // Import app directly, not the running server

describe("User Management API", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/api/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("message", "User registered successfully");
  });

  it("should not register a user with an existing email", async () => {
    const res = await request(app).post("/api/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveProperty("message");
  });
  it("should verify the user", async () => {
    const res = await request(app).post("/api/verify").send({
      email: "testuser@example.com",
    });
    expect(res.statusCode).toEqual(200);
  });

  let token;

  it("should login a user", async () => {
    const res = await request(app).post("/api/login").send({
      email: "testuser@example.com",
      password: "password123",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    token = res.body.token; // Save token for subsequent tests
  });

  it("should fetch user details", async () => {
    const res = await request(app)
      .get("/api/user/1")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("name");
  });
});
