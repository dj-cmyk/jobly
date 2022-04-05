"use strict";

const res = require("express/lib/response");
const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }


    /** Filter all companies based on any or all of the following filter criteria in the query string.
   *
   * Filter Criteria - 
   * name - filter by company name: 
   *    if the string “net” is passed in, this should find any company who name contains the word “net”, case-insensitive (so “Study Networks” should be included).
   * 
   * minEmployees - filter to companies that have at least that number of employees
   * 
   * maxEmployees - filter to companies that have no more than that number of employees
   * 
   * Returns { handle, name, description, numEmployees, logoUrl, jobs } of all companies that meet the filtering requirements
   *
   * Throws 400 BadRequestError if the minEmployees parameter is greater than the maxEmployees parameter.
   **/

  static async filter(filters) {
    // sql stmt base to build:
    let sqlStmtForFilter = `
      SELECT handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"
      FROM companies`

    // if name in filters object - add WHERE name ILIKE %nameFilter%
    if (filters.name !== undefined) {
      sqlStmtForFilter += ` WHERE name ILIKE '%${filters.name}%'`
    }
    // separating items in sql query statement
    if (Object.keys(filters).length > 1 && filters.name !== undefined) {
      sqlStmtForFilter += ` AND`
    } else if (filters.name === undefined) {
      sqlStmtForFilter += ` WHERE`
    }

    // if minEmployees AND maxEmployees in filters object - check if MAX is greater than MIN, then add to sql query, then add appropriate filter to sql query statement
    if (filters.minEmployees !== undefined && filters.maxEmployees !== undefined) {
      if (parseInt(filters.maxEmployees) < parseInt(filters.minEmployees)){
        throw new BadRequestError("max employees must be greater than min employees")
      } else {
        sqlStmtForFilter += ` num_employees BETWEEN ${parseInt(filters.minEmployees)} AND ${parseInt(filters.maxEmployees)}`
      }
    }  else if (filters.minEmployees !== undefined) {
      sqlStmtForFilter += ` num_employees > ${parseInt(filters.minEmployees)}`
    } else if (filters.maxEmployees !== undefined) {
      sqlStmtForFilter += ` num_employees < ${parseInt(filters.maxEmployees)}`
    }

    // make query using final version of sql query statement
    const filteredRes = await db.query(sqlStmtForFilter);
    return filteredRes.rows;
  }







  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
