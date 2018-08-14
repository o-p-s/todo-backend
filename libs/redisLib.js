//redis lib
const check = require("./checkLib.js");
const redis = require('redis');
const shortid = require('shortid');
const logger = require('./loggerLib.js');
let client = redis.createClient();

client.on('connect', () => {

    console.log("Redis connection successfully opened.......");

});

/**
 * USER RELATED HASH FUNCTIONS
 */

let getAllUsersInAHash = (hashName, callback) => {
    client.HGETALL(hashName, (err, result) => {
        if (err) {
            console.log(err);
            callback(err, null)
        } 
        else if (check.isEmpty(result)) {
            console.log("All Users list is empty.");
            console.log(result)
            callback(null, {})
        } else {
            console.log(result);
            callback(null, result)
        }
    });
}// end get all users in a hash

// function to set new online user.
let setUserInHash = (hashName, key, value, callback) => {
    client.HMSET(hashName, [ key, value ], (err, result) => {
        if (err) {
            logger.error('Could not set user in hash','setUserInHash',9)
            callback(err, null)
        } else {
            logger.info('User successfully set in hash','setUserInHash',9)
            callback(null, result)
        }
    });
}// end set a new online user in hash

//function to delete user from hash.
let deleteUserFromHash = (hashName,key)=>{
    client.HDEL(hashName,key,(err,res)=>{
        if(!err)
        return true;
    });
}// end delete user from hash

let getUserFromHash=(hashName,key,callback)=>{
    client.HGET(hashName,key,(err,res)=>{
        if(res!=null) callback(null,res)
        else callback(err,null)
    })
}
/**
 * LIST RELATED HASH FUNCTIONS
 */

let addListChangeInHash=(data,callback)=>{
    let createOperation=()=>{
        return new Promise((resolve,reject)=>{ 
            let operationId=shortid.generate(); 
            if(data.action=='create'|| data.action=='delete'){
                client.HSET(data.userId,[operationId,data.action],(err,result)=>{
                    if(err){
                        logger.error(err+'List could not be hashed for user hash','redisLib:setListsInUser:HSET()',9)
                        callback(err,null)
                    }else {
                        logger.info('List Successfully hashed in user hash','redisLib:setListsInUser:HSET()',9);                   
                        callback(null,result)
                    }
                });
            }         
            client.HMSET('allOperations',[operationId,JSON.stringify(data)],(err,result)=>{ 
                if(err){
                    logger.error(err+'Operation could not be hashed','addListChangeInHash:createOperation()',9)
                    reject(err)
                }else {
                    logger.info('Operation Successfully hashed','addListChangeInHash:createOperation()',9) 
                    resolve(operationId)
                }
            })
        })
    }
    let addOperationToList=(operationId)=>{
        return new Promise ((resolve,reject)=>{
            if(data.action!='delete'){
                client.HMSET(data.listId,[operationId,data.action],(err,result)=>{ 
                    if(err){
                        logger.error(err+'Operation hash was not added to list hash','addListChangeInHash:addOperationToList()',9)
                        reject(err)
                    }else {
                        logger.info('Operation hash successfully added to the list hash','addListChangeInHash:addOperationToList()',9)
                        resolve(result)
                    }
                })
            }else {resolve(null)}
    
        })
    } 
    
   createOperation(data)
   .then(addOperationToList)
   .then((resolve)=>{
        callback(null, resolve);
   }).catch((err)=>{
        callback(err, null)
   })
    
}

let getLastOperation=(data,callback)=>{
    let getOperationsOnList=()=>{   
        return new Promise((resolve,reject)=>{ 
            client.HGETALL(data.listId,(err,res)=>{
                if(err){
                    logger.error('error occurred','getOperationsOnList',9)
                    reject(err)
                }
                else if(check.isEmpty(res)){
                    logger.error('no operations on this list','getOperationsOnList',9)
                    callback(err,null)
                }
                else{
                    logger.info('Operations were found on the list','getOperationsOnList',9);
                    let last;
                    for(let operation in res){if(res.hasOwnProperty(operation)) last=operation;}
                    client.HDEL(data.listId,last);
                    resolve(last);
                }
            })
        })
    }
    let findlastOperation=(last)=>{
        return new Promise ((resolve,reject)=>{
            
            client.HGET('allOperations',last,(err,result)=>{
                if(err){
                reject(err)
                logger.error('last operation was not found','findLastOperation()',9)
                }
                else{
                    client.HDEL('Collections',last);
                    resolve(result)
                }
            })               
        })
    }
    getOperationsOnList(data)
    .then(findlastOperation)
    .then((resolve)=>{
        callback(null,resolve)
    }).catch((err)=>{
        callback(err,null)
    })
}

let deleteCompleteList=(data,callback)=>{
            client.HGETALL(data.listId,(err,res)=>{
                if(err){
                    logger.error('error occurred','getOperationsOnList',9)
                    callback(err,null)
                }
                else if(check.isEmpty(res)){
                    logger.error('no operations on this list','getOperationsOnList',9)
                    callback(err,null)
                }
                else{
                    logger.info('Operations were found on the list','getOperationsOnList',9)
                    for(let operation in res){
                        client.HDEL(data.listId,operation)
                        client.HDEL('allOperations',operation)
                    }
                    callback(null,res)
                }
            })
}

let getListsInUser=(data,callback)=>{
    let getUserHash=()=>{
        return new Promise((resolve,reject)=>{
            client.HGETALL(data.userId,(err,res)=>{
                if(err){
                logger.error(err+'Unable to fetch Lists in User Hash','redisLib:getListsInUser:HGETALL()',9)
                callback(null,res)
                }
                else if(check.isEmpty(res)){
                logger.error(err+'No Lists were found in User Hash','redisLib:getListsInUser:HGETALL()',9)
                callback(null,res)
                }else{
                    let last;for(let list in res){if(res.hasOwnProperty(list)){last=list}}
                    client.HDEL(data.userId,last);
                    resolve(last)
                }
            })
        })
    }
    let getLastListHash=(last)=>{
        return new Promise((resolve,reject)=>{
            client.HGET('allOperations',last,(err,res)=>{
                if(err){
                logger.error(err+'Unable to fetch last Operation in User Hash','redisLib:getListsInUser:HGETALL()',9)
                callback(null,res)
                }
                else if(check.isEmpty(res)){
                logger.error(err+'No List Operation was found in operations hash','redisLib:getListsInUser:HGETALL()',9)
                callback(null,res)
                }else{
                    resolve(res)
                }
            })
        })
    }
    getUserHash(data)
    .then(getLastListHash)
    .then((resolve)=>{callback(null,resolve)}).catch((err)=>{callback(err,null)})
}

module.exports = {
    getAllUsersInAHash:getAllUsersInAHash,
    setUserInHash:setUserInHash,
    deleteUserFromHash:deleteUserFromHash,
    addListChangeInHash:addListChangeInHash,
    getLastOperation:getLastOperation,
    deleteCompleteList:deleteCompleteList,
    getListsInUser:getListsInUser,
    getUserFromHash:getUserFromHash
}

