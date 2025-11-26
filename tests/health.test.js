import request from "supertest";
import app from "../src/app.js";

describe("Health Check API", () => {
  it("GET /health should return 200 OK", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("status", "ok");
  });

  it("GET /non-existing-route should return 404", async () => {
    const res = await request(app).get("/non-existing-route");

    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
  });
});
