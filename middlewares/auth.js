const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const request = require("request")
const Auth = mongoose.model('Auth')

const logger = require('./../libs/loggerLib')
const responseLib = require('./../libs/responseLib')
const token = require('./../libs/tokenLib')
const check = require('./../libs/checkLib')

let isAuthorized = (req, res, next) => {
  

  if (req.params.authToken || req.query.authToken || req.body.authToken || req.header('authToken')) {
    Auth.findOne({authToken: req.header('authToken') || req.params.authToken || req.body.authToken || req.query.authToken}, (err, authDetails) => {
      if (err) {
        console.log(err)
        logger.error(err.message, 'Authorization Middleware', 10)
        let apiResponse = responseLib.generate(true, 'Failed To Authorized', 500, null)
        res.status(500).send(apiResponse)
      } else if (check.isEmpty(authDetails)) {
        logger.error('No Authorization Key Is Present', 'Authorizatio nMiddleware', 10)
        let apiResponse = responseLib.generate(true, 'Invalid Or Expired Authorization Key', 404, null)
        res.status(404).send(apiResponse)
      } else {
        token.verifyToken(authDetails.authToken,authDetails.tokenSecret,(err,decoded)=>{

            if(err){
                logger.error(err.message, 'Authorization Middleware', 10)
                let apiResponse = responseLib.generate(true, 'Failed To Authorized', 500, null)
                res.status(500).send(apiResponse)
            }
            else{
                
                req.user = {userId: decoded.data.userId}
                next()
            }


        });// end verify token
       
      }
    })
  } else {
    logger.error('Authorization Token Missing', 'Authorization Middleware', 5)
    let apiResponse = responseLib.generate(true, 'Authorization Token Is Missing In Request', 400, null)
    res.status(400).send(apiResponse)
  }
}


module.exports = {
  isAuthorized: isAuthorized
}
