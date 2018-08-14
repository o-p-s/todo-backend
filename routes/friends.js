const express = require('express');
const router = express.Router();
const friendsController = require('./../controllers/friendsController')
const appConfig = require("./../../config/appConfig")
const auth = require('./../middlewares/auth')

module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/friends`;

    app.get(`${baseUrl}/requests`,auth.isAuthorized,friendsController.getAllRequests)
    /**
     * @apiGroup Read
     * @apiVersion  1.0.0
     * @api {post} /api/v1/friends/requests Fetch requests.
     * 
     * @apiParam {string} userId userId of the user. (query params) (required)
     * @apiParam {Number} skip required for pagination. (query params) (required)
     * @apiParam {string} authToken authToken of requesting user. (query params) (required)
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "All Requests found",
            "status": 200,
            "data": null

        }
    */
}