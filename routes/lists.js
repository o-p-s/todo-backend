const express = require('express');
const router = express.Router();
const listController = require('./../controllers/listController')
const appConfig = require("./../../config/appConfig")
const auth = require('./../middlewares/auth')

module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/lists`;

    app.get(`${baseUrl}/get/by/user`,auth.isAuthorized,listController.getUserLists)
        /**
     * @apiGroup Read
     * @apiVersion  1.0.0
     * @api {post} /api/v1/lists/get/by/user Fetch Lists.
     * 
     * @apiParam {string} userId userId of the user. (query params) (required)
     * @apiParam {Number} skip required for pagination. (query params) (required)
     * @apiParam {string} authToken authToken of requesting user. (query params) (required)
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "All lists found",
            "status": 200,
            "data": null

        }
    */
}