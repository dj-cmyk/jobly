"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "testJobTitle",
    salary: 100,
    equity: 0.5,
    company_handle: "c1"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    
    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${job.id}`);

    expect(result.rows).toEqual([
      {
        id: job.id,
        title: "testJobTitle",
        salary: 100,
        equity: "0.5",
        company_handle: "c1"
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();

    expect(jobs).toEqual([
      {
        id: jobs[0].id,
        title: "job1",
        salary: 100,
        equity: "0",
        company_handle: "c1",
      },
      {
        id: jobs[1].id,
        title: "job2",
        salary: 250,
        equity: "0.0123",
        company_handle: "c2",
      }
    ]);
  });
});


/************************************** filter */
// describe("filter", function () {
//   test("filters based on name", async function () {
//     let filters = {name: "1"}
//     let companies = await Company.filter(filters)
//     expect(companies).toEqual([
//       {
//         handle: "c1",
//         name: "C1",
//         description: "Desc1",
//         numEmployees: 1,
//         logoUrl: "http://c1.img",
//       }
//     ])
//   })
//   test("filters based on minEmployees", async function () {
//     let filters = {minEmployees: "2"}
//     let companies = await Company.filter(filters)
//     expect(companies).toEqual([
//       {
//         handle: "c3",
//         name: "C3",
//         description: "Desc3",
//         numEmployees: 3,
//         logoUrl: "http://c3.img",
//       }
//     ])
//   })
//   test("filters based on maxEmployees", async function () {
//     let filters = {maxEmployees: 2}
//     let companies = await Company.filter(filters)
//     expect(companies).toEqual([
//       {
//         handle: "c1",
//         name: "C1",
//         description: "Desc1",
//         numEmployees: 1,
//         logoUrl: "http://c1.img",
//       }
//     ])
//   })
//   test("filters based on min and max Employees", async function () {
//     let filters = {minEmployees: "1", maxEmployees: "2"}
//     let companies = await Company.filter(filters)
//     expect(companies).toEqual([
//       {
//         handle: "c1",
//         name: "C1",
//         description: "Desc1",
//         numEmployees: 1,
//         logoUrl: "http://c1.img",
//       },
//       {
//         handle: "c2",
//         name: "C2",
//         description: "Desc2",
//         numEmployees: 2,
//         logoUrl: "http://c2.img",
//       }
//     ])
//   })
//   test("filters based on name and max Employees", async function () {
//     let filters = {name: "2", maxEmployees: "100"}
//     let companies = await Company.filter(filters)
//     expect(companies).toEqual([
//       {
//         handle: "c2",
//         name: "C2",
//         description: "Desc2",
//         numEmployees: 2,
//         logoUrl: "http://c2.img",
//       }
//     ])
//   })
//   // test("min and max incorrect", async function () {
//   //   let filters = {minEmployees: "5", maxEmployees: "1"}
//   //   expect(await Company.filter(filters)).toThrowError(new BadRequestError("max employees must be greater than min employees"))
//   // })
// })


/************************************** get */

describe("get", function () {
  test("works", async function () {
    let jobs = await Job.findAll()
      
    let job = await Job.get(jobs[0].id);
    expect(job).toEqual({
        title: "job1",
        salary: 100,
        equity: "0",
        company_handle: "c1"
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(9999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "updatedJobTitle",
    salary: 9999,
    equity: 0.9
  };

  test("works", async function () {
    let jobs = await Job.findAll();
    let job = await Job.update(jobs[0].id, updateData);
    expect(job).toEqual({
        title: "updatedJobTitle",
        salary: 9999,
        equity: "0.9",
        company_handle: "c1"
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${jobs[0].id}`);
    expect(result.rows).toEqual([{
        title: "updatedJobTitle",
        salary: 9999,
        equity: "0.9",
        company_handle: "c1"
    }]);
  });

  test("works: null fields", async function () {
    let jobs = await Job.findAll();
    const updateDataSetNulls = {
      title: "New",
      salary: null,
      equity: null,
    };

    let job = await Job.update(jobs[0].id, updateDataSetNulls);
    expect(job).toEqual({
      company_handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${jobs[0].id}`);
    expect(result.rows).toEqual([{
      company_handle: "c1",
      title: "New",
      salary: null,
      equity: null
    }]);
  });

  test("not found if no such job id", async function () {
    try {
      await Job.update(9999, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      let jobs = await Job.findAll();
      await Job.update(jobs[0].id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    let jobs = await Job.findAll();

    await Job.remove(jobs[0].id);
    const res = await db.query(
        `SELECT id FROM jobs WHERE id=${jobs[0].id}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(9999);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
