const { sqlForPartialUpdate } = require("./sql");
const { BadRequestError } = require("../expressError");


describe("create sql for db UPDATE query", function () {
    test("creates sql with data", function () {
      const sqlQuery = sqlForPartialUpdate(
          { firstName: "test", isAdmin: false }, 
          {firstName: "first_name", isAdmin: "is_admin"});
      
      expect(sqlQuery).toEqual({
        setCols: `"first_name"=$1, "is_admin"=$2`,
        values: ["test", false]
      })
    });

    test("throws error due to no data sent", function () {
        expect(() => sqlForPartialUpdate({})).toThrow()
        expect(() => sqlForPartialUpdate({})).toThrowError(new BadRequestError("No data"))
    });

});

