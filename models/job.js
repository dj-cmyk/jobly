"use strict";

const res = require("express/lib/response");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, company_handle }) {
    const duplicateCheck = await db.query(
          `SELECT title, company_handle
           FROM jobs
           WHERE title = $1 AND
           company_handle = $2`,
        [title, company_handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title} at ${company_handle}`);

    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle`,
        [
            title, salary, equity, company_handle
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           ORDER BY salary`);
    return jobsRes.rows;
  }


    /** Filter all jobs based on any or all of the following filter criteria in the query string.
   *
   * Filter Criteria - 
   * name - filter by job title: 
   *    if the string “net” is passed in, this should find any job title that contains the word “net”, case-insensitive (so “Study Networks” should be included).
   * 
   * minSalary - filter to jobs that have at least that salary
   * 
   * hasEquity - if true, filter to jobs that provide a non-zero amount of equity. If false or not included in the filtering, list all jobs regardless of equity.
   * 
   * Returns { id, title, salary, equity, company_handle } of all jobs that meet the filtering requirements
   *
   * 
   **/

  static async filter(filters) {
    // sql stmt base to build:
    let sqlStmtForFilter = `
      SELECT id,
            title,
            salary,
            equity,
            company_handle
      FROM jobs`

    // if there is only one filter:
    if (Object.keys(filters).length === 1){
        if (filters.title !== undefined) {
            sqlStmtForFilter += ` WHERE title ILIKE '%${filters.title}%'`
        } else if (filters.minSalary !== undefined) {
            sqlStmtForFilter += ` WHERE salary > ${parseInt(filters.minSalary)}`
        } else {
            sqlStmtForFilter += ` WHERE equity IS NOT NULL AND equity > 0`
        }
    }
    
     
    // if there are more than one filter
    if (Object.keys(filters).length > 1) {
        sqlStmtForFilter += ` WHERE`
        let counter = 0
        for (let filter of Object.keys(filters)) {
            if (filter === "title"){
                sqlStmtForFilter += ` title ILIKE '%${filters.title}%'`
            } else if (filter === "minSalary") {
                sqlStmtForFilter += ` salary > ${parseInt(filters.minSalary)}`
            } else if (filter === "hasEquity") {
                if (filters.hasEquity === "true") {
                    sqlStmtForFilter += ` equity IS NOT NULL AND equity > 0`
                } else if (filters.hasEquity === "false") {
                    sqlStmtForFilter += ` equity >= 0 OR equity IS NULL`
                }
            }
            counter += 1
            if (counter < Object.keys(filters).length){
                sqlStmtForFilter += ` AND`
            }
        }
    }

    // make query using final version of sql query statement
    const filteredRes = await db.query(sqlStmtForFilter);
    return filteredRes.rows;
  }







  /** Given a job id, return data about the job.
   *
   * Returns { title, salary, equity, company_handle }
   *  
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`,
        [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          title: "title",
          salary: "salary",
          equity: "equity"
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${handleVarIdx} 
                      RETURNING title, salary, equity, company_handle`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No company: ${id}`);

    return job;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;
