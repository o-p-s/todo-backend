const mongoose = require('mongoose');
const path = require('path');
const shortid = require('shortid');
const time = require('./../libs/timeLib');
const response = require('./../libs/responseLib')
const logger = require('./../libs/loggerLib');
const validateInput = require('../libs/paramsValidationLib')
const check = require('../libs/checkLib')
const passwordLib = require('./../libs/passwordLib')
const token=require('./../libs/tokenLib')

const UserModel=mongoose.model('User')
const AuthModel=mongoose.model('Auth')
const signUpTokenModel=mongoose.model('signUpToken')
const passwordResetTokenModel=mongoose.model('passwordResetToken')

const url="http://realtime-todo.opsaini.com";

var  hbs = require('nodemailer-express-handlebars'),
  email = 'mailer.421@gmail.com',
  pass =  'random@12345'
  nodemailer = require('nodemailer');

var smtpTransport = nodemailer.createTransport({
  service:'Gmail'||'gmail',
  secure:true,
  auth: {
    user: 'mailer.421@gmail.com',
    pass: 'random@12345'
  }
});

var handlebarsOptions = {
    viewEngine: 'handlebars',
    viewPath: path.resolve('./app/templates/'),
    extName: '.html'
  };
  
  smtpTransport.use('compile', hbs(handlebarsOptions));

// start user signup function 
let signUpFunction = (req, res) => {
    let validateUserInput=()=>{
        return new Promise((resolve,reject)=>{
            if(req.body.email && req.body.password){
                if(!validateInput.Email(req.body.email)){
                    logger.error('Email Validation Failed','userController:signUpFunction:validateUserInput',6)
                    reject(response.generate(false,'Email Validation Failed',400,null));
                }else if(!validateInput.Password(req.body.password)){
                    logger.error('Password Validation Failed','userController:signUpFunction:validateUserInput',6)
                    reject(response.generate(false,'Password Validation Failed',400,null))
                }else{
                    logger.info('Validated User Input Successfully','userController:signUpFunction:validateUserInput',6)
                    resolve(req)
                }
            }
            else{
                logger.error('Required Parameters Missing', 'userController:signUpFunction:validateUserInput',6)
                reject(response.generate(true, 'One or More Required Parameter(s) Missing', 400, null))
            }
        })
    } // end validateUserInput
    let createUser=()=>{
        return new Promise((resolve,reject)=>{
            UserModel.findOne({email:req.body.email}).exec((err,retrievedUserDetails)=>{
                if(err){
                    logger.error(err.message, 'userController:signUpFunction:createUser:findOne', 1)
                    reject(response.generate(true, 'Internal Server Error', 500, null))
                }else if(check.isEmpty(retrievedUserDetails)){
                    let newUser= new UserModel({
                        userId: shortid.generate(),
                        firstName: req.body.firstName,
                        lastName: req.body.lastName || '',
                        email: req.body.email.toLowerCase(),
                        country:req.body.country,
                        countryCode:req.body.countryCode,
                        mobileNumber: req.body.mobileNumber,
                        password: passwordLib.hashpassword(req.body.password),
                        createdOn: time.now(),
                        rooms:req.body.rooms
                    })
                    newUser.save((err,newUser)=>{
                        if(err){
                            logger.error(err.message,'userController:signUpFunction:createUser:save', 1)
                            reject(response.generate(true, 'Internal Server Error', 500, null))
                        }else{
                            let newUserObj=newUser.toObject();
                            delete newUserObj.defaultAppRoom;
                            delete newUserObj.rooms;
                            delete newUserObj.countryCode;
                            delete newUserObj.country;
                            delete newUserObj.reset_password_token
                            delete newUserObj.reset_password_expires
                            delete newUserObj.password
                            delete newUserObj._id
                            delete newUserObj.__v
                            logger.info('New User Model saved Successfully','userController:signUpFunction:createUser:save',1)
                            resolve(newUserObj)
                        }
                    })
                }else{
                    logger.error('User Already Exists','userController:signUpFunction:createUser',1)
                    reject(response.generate(true, 'User Already Exists',409, null))
                }
            })
        })
    } //end createUser
    let generateToken=(user)=>{
        return new Promise((resolve,reject)=>{
            token.generateToken(user, (err, tokenDetails) => {
                if (err) {
                    logger.error(err.message,'userController:signUpFunction:generateToken',3)
                    reject(response.generate(true, 'Failed to generate Token', 500, null))
                } else {
                    tokenDetails.userId = user.userId;
                    tokenDetails.userDetails = user;
                    logger.info('User Token Generated Successfully','userController:signUpFunction:generateToken',3)
                    resolve(tokenDetails)
                }
            })
        })
    }
    let saveToken=(tokenDetails)=>{
        return new Promise((resolve,reject)=>{
            signUpTokenModel.findOne({userId:tokenDetails.userId},(err,retrievedTokenDetails)=>{
                if(err){
                    logger.error(err.message,'userController:signUpFunction:saveToken()', 1)
                    reject(response.generate(true, 'Internal Server Error', 500, null))
                } else if(check.isEmpty(retrievedTokenDetails)){
                    let newsignUpToken = new signUpTokenModel({
                        userId: tokenDetails.userId,
                        signUpToken: tokenDetails.token,
                        tokenSecret: tokenDetails.tokenSecret,
                        tokenValidationTime: Date.now()+ 86400000
                    })
                    newsignUpToken.save((err, newsignUpTokenDetails) => {
                        if (err) {
                            logger.error(err.message,'userController:signUpFunction:saveToken()',1)
                            reject(response.generate(true, 'Internal Server Error', 500, null))
                        } else {
                            logger.info('User Token Model saved Successfully','userController:signUpFunction:saveToken()',1)
                            resolve({token: newsignUpTokenDetails.signUpToken,userDetails: tokenDetails.userDetails})
                        }
                    })
                }else{
                    retrievedTokenDetails.signUpToken=tokenDetails.token
                    retrievedTokenDetails.tokenSecret=tokenDetails.tokenSecret
                    retrievedTokenDetails.tokenValidationTime = Date.now()+ 86400000
                    retrievedTokenDetails.save((err, newsignUpTokenDetails) => {
                        if (err) {  
                            logger.error(err.message,'userController:signUpFunction:saveToken()', 1)
                            reject(response.generate(true,'Internal Server Error', 500, null))
                        }else if(check.isEmpty(newsignUpTokenDetails)){
                            logger.error(err.message,'userController:signUpFunction:saveToken()',1)
                            reject(response.generate(true,'Failed to save new Token Details',404,null))
                        }else {
                            logger.info('New User Token Saved Successfully','userController:signUpFunction:saveToken()',1)
                            resolve({token: newsignUpTokenDetails.signUpToken,userDetails: tokenDetails.userDetails})
                        }
                    })
                }
            })
        })
    }
    let sendVerifyToken=(details)=>{
        return new Promise((resolve,reject)=>{
            var data = {
                to: details.userDetails.email,
                from: email,
                template: 'signUp',
                subject: 'WELCOME!',
                context: {
                  url: `${url}/sign-up-verification?token=` + details.token,
                  name: details.userDetails.firstName
                }
              };
              smtpTransport.sendMail(data, function(err) {
                if (!err) {
                    logger.info('Verify SignUp Process','userController:signUp:sendVerifyToken()',5)
                    resolve(response.generate(true, 'User Successfully Created! Kindly verify your email.', 200, null))
                } else {
                    logger.error(err.message,'userController:signUp:sendVerifyToken()',5)
                    reject(response.generate(true, 'Failed To send signup verification Mail', 500, null))
                }
              });
        })
    }
    validateUserInput(req,res)
    .then(createUser)
    .then(generateToken)
    .then(saveToken)
    .then(sendVerifyToken)
    .then((resolve)=>{
        res.status(200).send(resolve);
    },(reject)=>{console.log(reject);
        res.status(reject.status).send(reject);
    })
}
// end user signup function. 

// start of login function 
let loginFunction = (req, res) => {
    let findUser=()=>{
        return new Promise((resolve,reject)=>{
            if(req.body.email && req.body.password){
                if(!validateInput.Email(req.body.email)){
                    logger.error('Failed to validate Email','userController:loginFunction:findUser()',6)
                    reject(response.generate(false,'Failed to Validate Email',400,null))
                }else if(!validateInput.Password(req.body.password)){
                    logger.error('Failed to validate Password','userController:loginFunction:findUser()',6)
                    reject(response.generate(false,'Failed to Validate Password',400,null))
                }else{
                    UserModel.findOne({email:req.body.email})
                    .select('-mobileNumber -reset_password_token -reset_password_expires -rooms -defaultAppRoom')
                    .lean()
                    .exec((err,userDetails)=>{
                        if(err){
                            logger.error(err.message,'userController:loginFunction:findUser()',1)
                            reject(response.generate(true,'Internal Server Error',500,null))
                        }
                        else if(check.isEmpty(userDetails)){
                            logger.error('User Details not found','userController:loginFunction:findUser()',1)
                            reject(response.generate(true,'User Details Not Found',404,null))
                        }else{
                            logger.info('User Found', 'userController:loginFunction:findUser()',1)
                            resolve(userDetails)
                        }
                    })
                }
            }else{
                logger.error('Required Parameters missing','userController:loginFunction:findUser()',6)
                reject(response.generate(true,'One or More Required Parameters missing',400,null))
            }
        })
    } //end findUser
    let validatePassword=(retrievedUserDetails)=>{
        return new Promise((resolve,reject)=>{
            passwordLib.comparePassword(req.body.password,retrievedUserDetails.password,(err,isMatch)=>{
                if(err){
                    logger.error(err.message,'userController:loginFunction:validatePassword()',4)
                    reject(response.generate(true, 'Internal Server Error', 500, null))
                }else if(isMatch){
                    let retrievedUserDetailsObj = retrievedUserDetails
                    delete retrievedUserDetailsObj.password
                    delete retrievedUserDetailsObj._id
                    delete retrievedUserDetailsObj.__v
                    delete retrievedUserDetailsObj.createdOn
                    delete retrievedUserDetailsObj.modifiedOn
                    logger.info('Password verified succesfully','userController:loginFunction:validatePassword()',4)
                    resolve(retrievedUserDetailsObj)
                }else {
                    logger.info('Login Failed Due To Invalid Password', 'userController:loginFunctionLvalidatePassword()', 4)
                    reject(response.generate(true, 'Wrong Password. Login Failed!', 400, null))
                }
            })
        })
    }//end validatePassword
    let generateToken=(userDetails)=>{
        return new Promise((resolve, reject) => {
            token.generateToken(userDetails, (err, tokenDetails) => {
                if (err) {
                    logger.error(err.message,'userController:loginFunction:generateToken()',3)
                    reject(response.generate(true,'Failed To Generate Token', 500, null))
                } else {
                    tokenDetails.userId = userDetails.userId
                    tokenDetails.userDetails = userDetails
                    logger.info('User Token generated successfully','userController:loginFunction:generateToken()',3)
                    resolve(tokenDetails)
                }
            })
        })
    } //end generateToken
    let saveToken=(tokenDetails)=>{
        return new Promise((resolve,reject)=>{
            AuthModel.findOne({userId:tokenDetails.userId},(err,retrievedTokenDetails)=>{
                if(err){
                    logger.error(err.message, 'userController:loginFunction:saveToken()', 1)
                    reject(response.generate(true, 'Internal Server Error', 500, null))
                } else if(check.isEmpty(retrievedTokenDetails)){
                    let newAuthToken = new AuthModel({
                        userId: tokenDetails.userId,
                        authToken: tokenDetails.token,
                        tokenSecret: tokenDetails.tokenSecret,
                        tokenGenerationTime: time.now()
                    })
                    newAuthToken.save((err, newTokenDetails) => {
                        if (err) {
                            logger.error(err.message, 'userController:loginFunction:saveToken()', 1)
                            reject(response.generate(true, 'Failed To save Token', 500, null))
                        } else {
                            logger.info('User Token Saved Successfully', 'userController:loginFunction:saveToken()', 1)
                            resolve({authToken: newTokenDetails.authToken,userDetails: tokenDetails.userDetails})
                        }
                    })
                }else{
                    retrievedTokenDetails.authToken=tokenDetails.token
                    retrievedTokenDetails.tokenSecret=tokenDetails.tokenSecret
                    retrievedTokenDetails.tokenGenerationTime = time.now()
                    retrievedTokenDetails.save((err, newTokenDetails) => {
                        if (err) {  
                            logger.error(err.message, 'userController:loginFunction:saveToken()', 10)
                            reject(response.generate(true, 'Internal Server Error', 500, null))
                        } else {
                            logger.info('User Token saved Successfully', 'userController:loginFunction:saveToken()', 1)
                            resolve({authToken: newTokenDetails.authToken,userDetails: tokenDetails.userDetails})
                        }
                    })
                }
            })
        })
    } //end saveToken
    
    findUser(req,res)
    .then(validatePassword)
    .then(generateToken)
    .then(saveToken)
    .then((resolve)=>{
        res.status(200).send(response.generate(false,'Logged In Successfully',200,resolve))
    },(reject)=>{
        res.status(reject.status).send(reject)
    })
}
// end of the login function.

// start get all user function 
let getAllUsers=(req,res)=>{
    UserModel.find()
    .select(' -__v -_id -password -reset_password_expires -reset_password_token')
    .lean()
    .exec((err, result) => {
        if (err) {
            logger.error(err.message, 'userController:getAllUsers', 1)
            res.status(500).send(response.generate(true, 'Internal Server Error', 500, null))
        } else if (check.isEmpty(result)) {
            logger.info('No Users Found and sent successfully', 'userController:getAllUsers',1)
            res.status(404).send(response.generate(true, 'No Users Found', 404, null))
        } else {
            logger.info('All Users Found and sent successfully', 'userController:getAllUsers',1)
            res.status(200).send(response.generate(false, 'All User Details Found', 200, result))
        }
    })
}
//end get all user function.

//start single user details
let getSingleUser = (req, res) => {
    UserModel.findOne({ 'userId': req.params.userId })
        .select('-password -__v -_id -reset_password_expires -reset_password_token')
        .lean()
        .exec((err, result) => {
            if (err) {
                logger.error(err.message, 'userController:getSingleUser', 1)
                res.status(500).send(response.generate(true, 'Internal Server Error', 500, null))
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller:getSingleUser',1)
                res.status(404).send(response.generate(true, 'No User Found', 404, null))
            } else {
                logger.info('No User Found', 'User Controller:getSingleUser',1)
                res.status(200).send(response.generate(false, 'User Details Found', 200, result))
            }
        })
}// end get single user

// start user logout function
let logout = (req, res) => {
    if(req.body.userId){
        AuthModel.findOneAndRemove({userId:req.body.userId},(err,result)=>{
            if(err){
                logger.error(err.message, 'userController: logout', 1)
                res.status(500).send(response.generate(true, `error occurred: ${err.message}`, 500, null))
            }else if(check.isEmpty(result)){
                logger.error('Invalid Auth Token', 'userController: logout', 1)
                res.status(400).send(response.generate(true, 'Already Logged Out or Invalid UserId', 404, null))
            }else{
                logger.info('Logged Out Successfully', 'userController:logout', 1)
                res.status(200).send(response.generate(false, 'Logged Out Successfully', 200, null))
            }
        })
    }else{
        logger.error('Invalid Parameters', 'userController:logout', 6)
        res.status(400).send(response.generate(true, 'UserId not provided.', 400, null))
    }
} 
// end of the logout function.

// satrt user delete function
let deleteUser = (req, res) => {
    if(!check.isEmpty(req.params.userId)){
        UserModel.findOneAndRemove({ 'userId': req.params.userId }).exec((err, result) => {
            if (err) {
                logger.error(err.message, 'userController:deleteUser', 1)
                res.status(500).send(response.generate(true, 'Internal Server Error', 500, null))
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'User Controller:deleteUser',1)
                res.status(404).send(response.generate(true, 'No User Found', 404, null))
            } else {
                res.status(200).send(response.generate(false, 'User Deleted successfully', 200, result))
            }
        });// end user model find and remove
    }else{
        logger.error('User Id missing in params','userController:deleteUser()',6)
        res.status(400).send(response.generate(true,'User Id Missing in request params',400,false))
    }
}
// end delete user function.

// satrt user edit function
let editUser = (req, res) => {
    if(!check.isEmpty(req.body.userId)){
        let options = req.body;
        UserModel.update({ 'userId': req.params.userId }, options).exec((err, result) => {
            if (err) {
                logger.error(err.message, 'userController:editUser', 1)
                res.status(500).send(response.generate(true, 'Failed To edit user body', 500, null))
            } else if (check.isEmpty(result)) {
                logger.info('No User Found', 'userController:editUser',1)
                res.satus(404).send(response.generate(true, 'No User Found', 404, null))
            } else {
                logger.info('User Edited Successfully','userController:editUser',1)
                res.status(200).send(response.generate(false, 'User details edited', 200, result))
            }
        });// end user model update
    }else{
        logger.error('User Id missing in params','userController:editUser()',6)
        res.status(404).send(response.generate(true,'User Id Missing in request body',400,false))
    }

}
// end user edit function.

// reset password function
let resetPassword = (req, res) =>{
    let findToken=()=>{
        return new Promise((resolve,reject)=>{
            passwordResetTokenModel.findOneAndRemove(
                {passwordResetToken:req.body.token,
                tokenValidationTime:{$gt: Date.now()}})
                .exec((err,validToken)=>{
                    if(err){
                        logger.error('some error occurred','userController:resetPAsswrd;findToken()',1)
                        reject(esponse.generate(true, 'Token does not exist', 500, null))
                    }else if(check.isEmpty(validToken)){
                        logger.error('token expired or invalid.','userController:resetPassword:findToken()',1)
                        reject(response.generate(true, 'Token is expired', 409, null))
                    }else{
                        logger.info('Reset Password token verified and removed','userController:resetPassword;findToken()',1)
                        resolve(validToken);
                    }
                })
        })
    }
    let updateUser=(validToken)=>{
        return new Promise((resolve,reject)=>{
            UserModel.findOneAndUpdate({userId:validToken.userId},
            {password:passwordLib.hashpassword(req.body.newPassword)})
            .exec((err,updatedUser)=>{
                if(err){
                    logger.error('User not found','userController:resetPassword:updateUser()',1)
                    reject(response.generate(true, 'User Not Found', 500, null))
                }else if(check.isEmpty(updatedUser)){
                    logger.error('Empty User Record Found','userController:resetPassword:updateUser()',1)
                    reject(response.generate(true, 'Empty User Record Found', 400, null))
                }else{
                    logger.info('User Successfully Updated','userController:resetPassword:updateUser()',1)
                    resolve(updatedUser)
                }
            })
        })
    }
    let sendMail=(user)=>{
        return new Promise((resolve,reject)=>{
            var data = {
                to: user.email,
                from: email,
                template: 'reset-password',
                subject: 'Password Reset Confirmation',
                context: {
                  name: user.firstName
                }
              }
  
              smtpTransport.sendMail(data, function(err) {
                if (!err) {
                  logger.info('Password Reset Verification Mail sent!','userController:resetPassword:sendMail()',5)
                  resolve(response.generate(true, 'Password has been successfully Changed.', 200, null))
                } else {                
                  logger.error(err,'userController:resetPassword:sendMail()',5)
                  reject(response.generate(true, 'Failed To send Reset Password Mail', 500, null))
                }
              });
        })
    }
    findToken(req,res)
    .then(updateUser)
    .then(sendMail)
    .then((resolve)=>{
        res.status(200).send(resolve)
    },(reject)=>{
        res.status(reject.status).send(reject)
    })
}
// end user reset Password function.

let forgotPassword=(req,res)=>{
   let findUser=()=>{
       return new Promise((resolve,reject)=>{
            UserModel.findOne({email: req.body.email})
                .select('-verified -password -mobileNumber -reset_password_token -reset_password_expires -createdOn -rooms')
                .lean()
                .exec(function(err, user) {
                    if(err){
                        logger.error(err.message,'userController:forgotPassword:findUser()',1)
                        reject(response.generate(true, 'Failed To find user', 500, null))
                    }
                    else if(check.isEmpty(user)){
                        logger.error('No User Found','userController:forgotPassword:findUser()',1)
                        reject(response.generate(true, 'Failed To find user',404, null))
                    }                
                    else{
                    logger.info('User found','userController:forgotPassword:findUser()',1)
                    resolve(user)
                    }
            });
       })
   }
   let generateToken=(user)=>{
       return new Promise((resolve,reject)=>{
        token.generateToken(user, (err, tokenDetails) => {
            if (err) {
                logger.error(err.message,'userController:forgotPassword:generateToken()',3)
                reject(response.generate(true, 'Failed To Generate Token', 500, null))
            } else {
                tokenDetails.userDetails=user;
                logger.info('User Token Generated Successfully','userController:forgotPassword:generateToken()',3)
                resolve(tokenDetails)
            }
            })
       })
   }
   let saveToken=(tokenDetails)=>{
        return new Promise((resolve,reject)=>{
            passwordResetTokenModel.findOne({userId:tokenDetails.userDetails.userId},(err,retrievedTokenDetails)=>{
                if(err){
                    loggger.error(err.message, 'userController:forgotPassword:saveToken()', 1)
                    reject(response.generate(true, 'Failed To Save Token', 500, null))
                } else if(check.isEmpty(retrievedTokenDetails)){
                    let newpasswordResetToken = new passwordResetTokenModel({
                        userId: tokenDetails.userDetails.userId,
                        passwordResetToken: tokenDetails.token,
                        tokenSecret: tokenDetails.tokenSecret,
                        tokenValidationTime: Date.now()+ 86400000
                    })
                    newpasswordResetToken.save((err, newpasswordResetTokenDetails) => {
                        if (err) {
                            logger.error(err.message, 'userController:forgotPassword:saveToken', 1)
                            reject(response.generate(true, 'Failed To save Password Reset Token', 500, null))
                        } else {
                            logger.info('Password Reset token saved', 'userController:forgotPassword:saveToken', 1)
                            resolve({token: newpasswordResetTokenDetails.passwordResetToken,userDetails: tokenDetails.userDetails})
                        }
                    })
                }else{
                    retrievedTokenDetails.passwordResetToken=tokenDetails.token
                    retrievedTokenDetails.tokenSecret=tokenDetails.tokenSecret
                    retrievedTokenDetails.tokenValidationTime = Date.now()+ 86400000
                    retrievedTokenDetails.save((err, newpasswordResetTokenDetails) => {
                        if (err) {  
                            logger.error(err.message, 'userController:forgotPassword:saveToken', 1)
                            reject(response.generate(true, 'Failed To save Token', 500, null))
                        } else {
                            logger.info('Password Reset token saved', 'userController:forgotPassword:saveToken', 1)
                            resolve({token: newpasswordResetTokenDetails.passwordResetToken,userDetails: tokenDetails.userDetails})
                        }
                    })
                }
            })
        })
    }
    let sendMail=(details)=>{
        return new Promise((resolve,reject)=>{
            var data = {
                to: details.userDetails.email,
                from: email,
                template: 'forgot-password',
                subject: 'Password RESET!',
                context: {
                  url: `${url}/reset-password?token=` + details.token,
                  name: details.userDetails.firstName
                }
              };
              smtpTransport.sendMail(data, function(err) {
                if (!err) {
                    logger.info('Reset Link sent!','userController:forgotPassword:sendMail()',5)
                    resolve(response.generate(true, 'Kindly check your email for further instructions', 200, null))
                } else {
                    logger.error(err.message,'userController:forgotPassword:sendMail()',5)
                    reject(response.generate(true, 'Failed To send Mail', 500, null))
                }
              });
        })
    }
    findUser(req,res)
    .then(generateToken)
    .then(saveToken)
    .then(sendMail)
    .then((resolve)=>{
        res.status(200).send(resolve)
    },(reject)=>{
        res.status(reject.status).send(reject)
    })
}

let signUpVerification=(req,res)=>{
    let findVerificationToken=()=>{
        return new Promise((resolve,reject)=>{
        signUpTokenModel.findOneAndRemove({signUpToken:req.body.token,tokenValidationTime:{$gt: Date.now()}})
            .exec((err,validToken)=>{
                if(err){
                    logger.error('some error occurred','userController:signUpVerification;findVerificationToken()',1)
                    reject(response.generate(true, 'Sign Up Token does not exist', 500, null))
                }else if(check.isEmpty(validToken)){
                    logger.error('token expired or invalid.','userController:signUpVerification;findVerificationToken()',1)
                    reject(response.generate(true, 'Sign Up Token is expired', 409, null))
                }else{
                    logger.info('Sign Up token verified and removed','userController:signUpVerification;findVerificationToken()',1)
                    resolve(validToken);
                }
            })
        })
    }
    let updateUser=(validToken)=>{
        return new Promise((resolve,reject)=>{
            UserModel.findOneAndUpdate({userId:validToken.userId},{verified:true})
            .exec((err,updatedUser)=>{
                if(err){
                    logger.error('User not found','userController:signUpVerification;updateUser()',1)
                    reject(response.generate(true, 'User Not Found', 500, null))
                }else if(check.isEmpty(updatedUser)){
                    logger.error('Empty User Record Found','userController:signUpVerification;updateUser()',1)
                    reject(response.generate(true, 'Empty User Recoed Found', 404, null))
                }else{
                    logger.info('User Successfully Updated','userController:signUpVerification;updateUser()',1)
                    resolve(updatedUser)
                }
            })
        })
    }
    let sendMail=(user)=>{
        return new Promise((resolve,reject)=>{
            var data = {
                to: user.email,
                from: email,
                template: 'signUpVerified',
                subject: 'Email Verified!',
                context: {
                  name: user.firstName
                }
              }
  
              smtpTransport.sendMail(data, function(err) {
                if (!err) {
                  logger.info('Sign Up Verification Mail sent!','userController:signUpVerification:sendMail()',5)
                  resolve(response.generate(true, 'Email has been successfully Verified', 200, null))
                } else {                
                  logger.error(err,'userController:sendMail()',5)
                  reject(response.generate(true, 'Failed To send Mail', 500, null))
                }
              });
        })
    }
    findVerificationToken(req,res)
    .then(updateUser)
    .then(sendMail)
    .then((resolve)=>{
        res.status(200).send(resolve)
    },(reject)=>{
        res.status(reject.status).send(reject)
    })
}

// HTML templates for smtp mails
let render_forgot_password_template = function(req, res) {
    return res.sendFile('./../templates/forgot-password.html',{root: __dirname});
};

let render_reset_password_template = function(req, res) {
    return res.sendFile('./../templates/reset-password.html',{root: __dirname});
};

let render_signUp_template=function(req,res){
    return res.sendFile('./../templates/signUp.html',{root: __dirname});
}
let render_signUpVerified_template=function(req,res){
    return res.sendFile('./../templates/signUpVerified.html',{root: __dirname});
}

//end single user detials
module.exports = {
    signUpFunction: signUpFunction,
    loginFunction: loginFunction,
    logout: logout,
    editUser:editUser,
    deleteUser:deleteUser,
    forgotPassword:forgotPassword,
    getAllUsers:getAllUsers,
    getSingleUser:getSingleUser,
    resetPassword:resetPassword,
    signUpVerification:signUpVerification,
    render_forgot_password_template:render_forgot_password_template,
    render_reset_password_template:render_reset_password_template,
    render_signUp_template:render_signUp_template,
    render_signUpVerified_template:render_signUpVerified_template,
}// end exports