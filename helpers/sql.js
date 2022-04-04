const { BadRequestError } = require("../expressError");

/** sqlForPartialUpdate: helper function to update a single user or a single company.
 *
 * Takes JSON data sent with a patch request, 
 * pulls out the keys from the object and maps those keys to a number. 
 * These numbers are then used in the UPDATE query 
 * The values from the object are also used in the UPDATE query
 * This is done to help prevent a SQL injection attack
 * 
 * for example:
 * {username: "someUser", firstName: "some", lastName: "User"}
 * username is set to $1, firstName is set to $2, lastName is set to $3
 * the values "someUser", "some", "User" are stored in a new array to be used
 * in the db query
 *
 * Error will be thrown if no data is sent.
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
