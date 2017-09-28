/**
 *
 * @apiDefine Authorization
 * @apiHeader {String} Authorization Token returned at login/signup
 *
 */

 /**
  *
  * @apiDefine Error
  * @apiErrorExample {json} Error:
  *     HTTP/1.1 400 or 500 Error Code
  *     {
  *       "message": "Error message here"
  *     }
  *
  */

 /**
  *
  * @apiDefine Paging
  * @apiParam {Number} [pageSize = 20] Number of objects to get back (min 1, max 20)
  * @apiParam {String} [sort = "asc"] Ascending (asc) or descending (desc) sort order
  * @apiParam {String} [sortKey = "dateCreated"] Object property to sort by
  *
  */