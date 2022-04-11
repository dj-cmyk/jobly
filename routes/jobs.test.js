"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token, u2Token, u4Token,  
  //u4Token is admin user, u1Token is not admin
  jobId
} = require("./_testCommon");

const Job = require("../models/job");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    company_handle: "c1",
    title: "New",
    salary: 9999,
    equity: 0.1
  };

  test("ok for admin user", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u4Token}`);
    
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        company_handle: "c1",
        title: "New",
        salary: 9999,
        equity: "0.1",
        id: resp.body.job.id
      }
    });
  });

  test("fails for standard user", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new job"
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
            company_handle: "c1",
            title: "Invalid Job",
            salary: "9999",
            equity: "0.1"
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const jobs = await Job.findAll()

    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
            company_handle: "c1",
            title: "job1",
            salary: 1,
            equity: "0.01",
            id: jobs[0].id
            },
            {
            title: "job2",
            salary: 100,
            equity: null,
            company_handle: "c1",
            id: jobs[1].id
            }
          ],
    });
  });

  test("ok for title filter", async function () {
    const jobs = await Job.findAll()

    const resp = await request(app).get("/jobs?title=1");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                company_handle: "c1",
                title: "job1",
                salary: 1,
                equity: "0.01",
                id: jobs[0].id
            }
          ],
    });
  });

  test("ok for minSalary filter", async function () {
    const jobs = await Job.findAll()
    const resp = await request(app).get("/jobs?minSalary=9");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                title: "job2",
                salary: 100,
                equity: null,
                company_handle: "c1",
                id: jobs[1].id
            }
          ],
    });
  });

  test("ok for hasEquity filter", async function () {
    const jobs = await Job.findAll()
    const resp = await request(app).get("/jobs?hasEquity=true");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                company_handle: "c1",
                title: "job1",
                salary: 1,
                equity: "0.01",
                id: jobs[0].id
            }
          ],
    });
  });

  test("ok for multiple filters", async function () {
    const jobs = await Job.findAll()
    const resp = await request(app).get("/jobs?minSalary=5&title=job");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                title: "job2",
                salary: 100,
                equity: null,
                company_handle: "c1",
                id: jobs[1].id
            }
          ],
    });
  });

  test("fails for invalid filter", async function () {
    const resp = await request(app).get("/jobs?color=1");
    expect(resp.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
      let jobs = await Job.findAll()
    const resp = await request(app).get(`/jobs/${jobs[0].id}`);
    expect(resp.body).toEqual({
      job: {
        company_handle: "c1",
        title: "job1",
        salary: 1,
        equity: "0.01"
      },
    });
  });



  test("not found for no such job id", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin user", async function () {
      let jobs = await Job.findAll()
    const resp = await request(app)
        .patch(`/jobs/${jobs[0].id}`)
        .send({
          title: "job1 - new",
          salary: 99,
          equity: 0
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.body).toEqual({
        job: {
            company_handle: "c1",
            title: "job1 - new",
            salary: 99,
            equity: "0"
          },
    });
  });

  test("unauth for standard user", async function () {
    let jobs = await Job.findAll()
    const resp = await request(app)
        .patch(`/jobs/${jobs[0].id}`)
        .send({
          title: "job1 - new",
        })
        .set("authorization", `Bearer ${u2Token}`);;
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    let jobs = await Job.findAll()
    const resp = await request(app)
        .patch(`/jobs/${jobs[0].id}`)
        .send({
          title: "job1 - new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/0`)
        .send({
          title: "new job title",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    let jobs = await Job.findAll()
    const resp = await request(app)
        .patch(`/jobs/${jobs[0].id}`)
        .send({
          id: 100,
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    let jobs = await Job.findAll()
    const resp = await request(app)
        .patch(`/jobs/${jobs[0].id}`)
        .send({
          salary: "not-a-salary-number",
        })
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin users", async function () {
    let jobs = await Job.findAll()
    const resp = await request(app)
        .delete(`/jobs/${jobs[0].id}`)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.body).toEqual({ deleted: `${jobs[0].id}` });
  });

  test("unauth for standard user", async function () {
    let jobs = await Job.findAll()
    const resp = await request(app)
        .delete(`/jobs/${jobs[0].id}`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    let jobs = await Job.findAll()
    const resp = await request(app)
        .delete(`/companies/${jobs[0].id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/jobs/0`)
        .set("authorization", `Bearer ${u4Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});