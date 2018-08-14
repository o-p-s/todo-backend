const express = require('express');
const router = express.Router();
const userController = require("./../../app/controllers/userController");
const appConfig = require("./../../config/appConfig")
const auth = require('./../middlewares/auth')
module.exports.setRouter = (app) => {

    let baseUrl = `${appConfig.apiVersion}/users`;

    // defining routes.
    app.get(`${baseUrl}/all`,auth.isAuthorized, userController.getAllUsers);
       /**
     * @apiGroup Read
     * @apiVersion  1.0.0
     * @api {get} /api/v1/users/all All users.
     * @apiDescription Get list of all users
     *
     *@apiParam {string} [authToken] authToken of requesting user. (query params) (required)
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * 
     * @apiSuccessExample {object} Success-Response:
      {
        [  
            {
                "friends": [],
                "createdOn": "2018-08-08T06:16:11.000Z",
                "mobileNumber": 0,
                "email": "sam2mail@gmail.com",
                "lastName": "Ple",
                "firstName": "Sam",
                "userId": "-mriqchCn"
            },
            {
                "friends": [],
                "createdOn": "2018-08-08T06:24:52.000Z",
                "mobileNumber": 7896785674,
                "email": "trial00@gmail.com",
                "lastName": "Account",
                "firstName": "Trial",
                "userId": "AX89NnZ0g"
            }
        ]
    }
   */
    app.get(`${baseUrl}/:userId`,auth.isAuthorized, userController.getSingleUser);
    /**
     * @apiGroup Read
     * @apiVersion  1.0.0
     * @api {get} /api/v1/users/:userId Single user.
     * @apiDescription Gets Single user from database 
     * @apiParam {string} [userId] userId of the user. (body params) (required)
     *@apiParam {string} [authToken] authToken of requesting user. (query params) (required)
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
        {
            "error": false,
            "message": "User Details Found",
            "status": 200,
            "data": {
                "friends": [],
                "createdOn": "2018-08-08T06:24:52.000Z",
                "mobileNumber": 7896785674,
                "email": "trial00@gmail.com",
                "lastName": "Account",
                "firstName": "Trial",
                "userId": "AX89NnZ0g"
            }
        }
   */
    // params: firstName, lastName, email, mobileNumber, password
    app.route(`${baseUrl}/signup`).get(userController.render_signUp_template).post(userController.signUpFunction);
    /**
     * @apiGroup Create
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/signup Signup.
     *
     * @apiParam {string} email email of the user. (body params) (required)
     * @apiParam {string} password password of the user. (body params) (required)
     * @apiParam {Number} mobileNumber password of the user. (body params) 
     * @apiParam {String} country Country of the user. (body params) 
     * @apiParam {String} countryCode country code of mobile number. (body params) 
     * @apiParam {string} firstName password of the user. (body params) (required)     
     * @apiParam {string} latName password of the user. (body params) (required)
     *
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
        {
            "error": false,
            "message": "User Successfully Created",
            "status": 200,
            "data": {
                "createdOn": "2018-08-08T06:24:52.000Z",
                "mobileNumber": 7896785674,
                "email": "trial00@gmail.com",
                "lastName": "Account",
                "firstName": "Trial",
                "userId": "AX89NnZ0g",
                "friends":[]
            }
        }
   */
 
    // params: email, password.
    app.post(`${baseUrl}/login`, userController.loginFunction);
    /**
     * @apiGroup Read
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/login Login.
     *
     * @apiParam {string} email email of the user. (body params) (required)
     * @apiParam {string} password password of the user. (body params) (required)
     *
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
        {
            "error": false,
            "message": "User Logged In Successfully",
            "status": 200,
            "data": {
                "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RpZCI6IkFreGw5TEVQRiIsImlhdCI6MTUzMjE1NDM1MjUwNSwiZXhwIjoxNTMyMjQwNzUyLCJzdWIiOiJhdXRoVG9rZW4iLCJpc3MiOiJlZENoYXQiLCJkYXRhIjp7ImVtYWlsIjoidHJpYWwwMEBnbWFpbC5jb20iLCJsYXN0TmFtZSI6IkFjY291bnQiLCJmaXJzdE5hbWUiOiJUcmlhbCIsInVzZXJJZCI6IkFYODlOblowZyJ9fQ.BClXwBjVCApZPc5ca6c7W2ApwT5vD93NrUC154adUcg",
                "userDetails": {
                    "email": "trial00@gmail.com",
                    "lastName": "Account",
                    "firstName": "Trial",
                    "userId": "AX89NnZ0g",
                    "friends":[]
                }
            }
        }
    */

    app.post(`${baseUrl}/logout`,auth.isAuthorized, userController.logout);
    /**
     * @apiGroup Update
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/logout Logout.
     * 
     * @apiParam {string} userId userId of the user. (auth headers) (required)
     *@apiParam {string} authToken authToken of requesting user. (query params) (required)
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "Logged Out Successfully",
            "status": 200,
            "data": null

        }
    */

    // auth token params: userId.
    app.post(`${baseUrl}/delete/:userId`,auth.isAuthorized, userController.deleteUser);
    /**
     * @apiGroup Delete
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/delete/:usrId Delete user.
     * @apiDescription Deletes a user from database.
     * 
     * @apiParam {string} userId userId of the user. (auth headers) (required)
     *@apiParam {string} authToken authToken of requesting user. (query params) (required)
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
         {
            "error": false,
            "message": "User Deleted Successfully",
            "status": 200,
            "data": null

        }
    */

    app.route(`${baseUrl}/forgot-password`).get(userController.render_forgot_password_template).post(userController.forgotPassword);
    /**
     * @apiGroup Update
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/forgot-password Forgot password.
     *    
     * @apiParam {string} email email of the user. (required)
     *
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
        {
            "error": true,
            "message": "Kindly check your email for further instructions",
            "status": 200,
            "data": null
        }
    */
    app.route(`${baseUrl}/reset-password`).get(userController.render_reset_password_template).post(userController.resetPassword);
        /**
     * @apiGroup Update
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/reset-password Reset password.
     *    
     * @apiParam {string} token password reset token. (required)
     *
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
        {
            "error": true,
            "message": 'Password has been successfully Changed.",
            "status": 200,
            "data": null
        }
    */
    app.route(`${baseUrl}/signUp-verification`).get(userController.render_signUpVerified_template).post(userController.signUpVerification);
           /**
     * @apiGroup Update
     * @apiVersion  1.0.0
     * @api {post} /api/v1/users/signUp-verification Verify User Signup.
     *    
     * @apiParam {string} token signup verification token. (required)
     *
     * @apiSuccess {object} myResponse shows error status, message, http status code, result.
     * 
     * @apiSuccessExample {object} Success-Response:
        {
            "error": true,
            "message": 'Email has been successfully Verified",
            "status": 200,
            "data": null
        }
    */
}
