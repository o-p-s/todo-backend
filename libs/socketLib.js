/**
 * modules dependencies.
 */
const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const logger = require('./loggerLib.js');
const events = require('events');
const eventEmitter = new events.EventEmitter();

const tokenLib = require("./tokenLib.js");
const check = require("./checkLib.js");
const redisLib =require('./redisLib.js')
/** MODELS */
const ListModel= mongoose.model('List');
const UserModel = mongoose.model('User');
const RequestModel=mongoose.model('Request');

let setServer = (server) => {

    let io = socketio.listen(server);

    let myIo = io.of('')

    myIo.on('connection',(socket) => {

        console.log("\n------------------------------------SOCKET CONNECTION OPEN---------------------------------------------");
        
        /**
         * USER AND FRIENDS RELATED SOCKETS
         */

        socket.on('set-user',(authToken) => {
            logger.info('User asking for USERS LIST','Updating LISTS......',8)
            tokenLib.verifyClaimWithoutSecret(authToken,(err,user)=>{
                if(err){
                    socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' })
                }
                else{
                    console.log("\n User has been verified..  setting details\n");

                    function joinRooms(currentUser){
                        socket.defaultRoom='app-room';
                        socket.join(currentUser.userId); //joining self Room
                        socket.join(socket.defaultRoom);
                        if(!check.isEmpty(socket.friends) && socket.friends.length!=0){
                            for(let x of socket.friends){
                                socket.join(x);
                            }
                          }  
                    }
                    function checkInActiveUsers(currentUser){
                        redisLib.getUserFromHash('activeUsers',currentUser.userId,(err,activeUser)=>{
                            if(err)
                                logger.error('Error in searching activeUsers','socketLib:set-user:checkInActiveUsers',3)
                            else if(check.isEmpty(activeUser)){
                                logger.info('Record not found in activeUsers','socketLib:set-user:checkInActiveUsers',3)
                                redisLib.setUserInHash('activeUsers',currentUser.userId,currentUser.fullName,(err,newActiveUsers)=>{
                                    if(err)
                                    logger.error('Some Error Occurred in setting newActiveUsers','socketLib:set-user:checkInActiveUsers',3)
                                    else if(check.isEmpty(newActiveUsers))
                                    logger.error('Empty new activeUsers found','socketLib:set-user:checkInActiveUsers',3)    
                                    else{
                                    logger.info('Record was successfully set in activeUsers','socketLib:set-user:checkInActiveUsers',3)
                                    joinRooms(currentUser)
                                    }
                                })
                            }else
                                logger.info('Record was found in activeUsers','socketLib:set-user:checkInActiveUsers',3)
                            
                        })
                    
                    }
                    function checkInAllUsersList(){
                            redisLib.getUserFromHash('AllUsersList',currentUser.userId,(err,registeredUser)=>{
                                if(err)
                                    logger.error('Error in searching AllUsersList','socketLib:set-user:checkInAllUsersList',3)
                                else if(check.isEmpty(registeredUser)){
                                    logger.info('Record not found in allUsers','socketLib:set-user:checkInAllUsersList',3)
                                    redisLib.setUserInHash('AllUsersList',currentUser.userId,currentUser.fullName,(err,newRegisteredUsers)=>{
                                        if(err)
                                        logger.error('Some Error Occurred in setting newAllUsersList','socketLib:set-user:checkInAllUsersList',3)
                                        else if(check.isEmpty(newRegisteredUsers))
                                        logger.error('Empty new allRegisteredUsers found','socketLib:set-user:checkInAllUsersList',3)                                   
                                        else{
                                        logger.info('Record was successfully set in allRegisteredUsers','socketLib:set-user:checkInAllUsersList',3)
                                        checkInActiveUsers(currentUser)
                                        }
                                    })
                                }else{
                                    logger.info('Record was found in allRegisteredUsers','socketLib:set-user:checkInAllUsersList',3)         
                                    checkInActiveUsers(currentUser);
                                }
                            })
                    
                    }

                    let currentUser = user.data;                    
                    socket.userId = currentUser.userId;                    
                    socket.friends=currentUser.friends;
                    currentUser['fullName']=`${currentUser.firstName} ${currentUser.lastName}`;
                    checkInAllUsersList(currentUser);
                }
            
            })
        }) // end of listening set-user event
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "set-user"  Sets  User
         * @apiDescription Verifies authenticated token, sets user in AllUsersList if a new registeration otherwise updates online users list.
         * 
         * @apiParam {string} authToken token for verification. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
            [
                { "tw-syQJJ9":"User11 L11"},
                {"Y_nchyDcv":"user103 S"}
            ]
        */
        socket.on('disconnect', () => {
            redisLib.deleteUserFromHash('activeUsers',socket.userId);    
            socket.leave(socket.userId);
            socket.leave(socket.defaultRoom);
            if(!check.isEmpty(socket.friends) && socket.friends.length!=0){
                for (let f of socket.friends) {
                    socket.leave(f)   
                }
            }

        }) // end of on disconnect
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "disconnect" Disconnect
         * @apiDescription Disconnect the user from socket,remove the user from online list, unsubscribe the user from his own channel.
         * 
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "tw-syQJJ9":"User11 L11"}
            ]
        */
        socket.on('get-users',()=>{
            redisLib.getAllUsersInAHash('AllUsersList',(err,result)=>{
                if(err){
                    logger.error('error occurred in getting all users list','socketLib:get-users',3)
                    result['status']=500;
                }
                else if(result){
                    logger.info('All Users List fetched from hashes','socketLib:get-users',3);
                    socket.emit('all-users-list',result);
                }
            })            
        })
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "get-user" All Users List
         * @apiDescription Fetches and emits the updated list of all registered users in the server
         * 
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "tw-syQJJ9":"User11 L11"},
                {"Y_nchyDcv":"user103 S"}
            ]
        */
         /**
         * @apiGroup Emitter
         * @apiVersion  1.0.0
         * @api {on} "all-users-list" All Users List
         * @apiDescription Fetches and emits the updated list of all registered users in the server
         * 
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "tw-syQJJ9":"User11 L11"},
                {"Y_nchyDcv":"user103 S"}
            ]
        */
        socket.on('send-request',(data)=>{
            eventEmitter.emit('send-friend-request',(data));
            data['action']='new request';
            socket.emit('new request',data);
            myIo.emit(data.receiverId,data);
        })
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "send-request" Sends Request
         * @apiDescription sends new request to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"new request"
                }
            ]
        */
              /**
         * @apiGroup Emitter
         * @apiVersion  1.0.0
         * @api {on} "new request" Sends Request
         * @apiDescription sends new request to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"new request"
                }
            ]
        */
        socket.on('cancel-request',(data)=>{
            eventEmitter.emit('cancel-friend-request',(data));
            data['action']='cancel request';            
            socket.emit('cancel request',data);
            myIo.emit(data.receiverId,data);
        })
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "cancel-request" Cancels Request
         * @apiDescription Cancel any request and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"cancel request"
                }
            ]
        */
               /**
         * @apiGroup Emitter
         * @apiVersion  1.0.0
         * @api {on} "cancel request" Cancels Request
         * @apiDescription Cancel any request and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"cancel request"
                }
            ]
        */
        socket.on('accept-request',(data)=>{
            eventEmitter.emit('accept-friend-request',(data));
            data['action']='accept request';            
            socket.emit('accept request',data);
            myIo.emit(data.senderId,data);
        })
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "accept-request" Accepts Request
         * @apiDescription Accepts any request and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"accept request"
                }
            ]
        */
              /**
         * @apiGroup Emitter
         * @apiVersion  1.0.0
         * @api {on} "accept request" Accepts Request
         * @apiDescription Accepts any request and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"accept request"
                }
            ]
        */
        socket.on('decline-request',(data)=>{
            eventEmitter.emit('decline-friend-request',(data));
            data['action']='decline request';            
            socket.emit('decline request',data);
            myIo.emit(data.senderId,data);
        })
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "decline request" Declines Request
         * @apiDescription Declines any request and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"decline request"
                }
            ]
        */
        /**
         * @apiGroup Emitter
         * @apiVersion  1.0.0
         * @api {on} "decline request" Declines Request
         * @apiDescription Declines any request and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"decline request"
                }
            ]
        */
        socket.on('remove-friend',(data)=>{
            eventEmitter.emit('unfriend',(data));
            data['action']='remove friend';
            socket.emit('remove friend',data);
            myIo.emit(data.userId,data)
        })
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "remove-friend" Remove friend
         * @apiDescription Removes any frined and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"remove friend"
                }
            ]
        */
               /**
         * @apiGroup Emitter
         * @apiVersion  1.0.0
         * @api {on} "remove friend" Remove friend
         * @apiDescription Removes any frined and send updated request state to receiver and sender, on updating databases.
         * 
         * @apiParam {string} senderId sender's uesrId. (required)
         * @apiParam {string} receiverId receiver's userId. (required)
         * @apiParam {string} senderName sender's Name. (required)
         * @apiParam {string} receiverName receiver's Name. (required)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "senderId":"tw-syQJJ9",
                  "senderName":"User11 L11",
                  "receiverId":'Y_nchyDcv",
                  "receiverName":"user103 S",
                  "action":"remove friend"
                }
            ]
        */
        /**
         * LIST RELATED SOCKETS
         */
        socket.on('create-list', (data) => {
            logger.info("socket Creating New List .....",'sokcetLib:saveList()',10);            
            data['action']='create';                    //action set to create

            console.log('Creating New List.... adding Ids!!');
            data['listId'] = shortid.generate();

            if (data['items'].length!=0){
                for (let item of data['items']) {
                    item.itemId=shortid.generate();
                    if(item.subitems.length!=0){
                        for (let subitem of item.subitems) {
                            subitem.subitemId=shortid.generate();
                        }
                    }
                }
            }
            eventEmitter.emit('save-list', data);        
            eventEmitter.emit('update-user-model', data);

            //setting hashes
            eventEmitter.emit('set-operation',(data));

            //setting message for users
            if(!check.isEmpty(data['friendName']))           
                data['message']=`${data.friendName} has created a list "${data.listName}" in ${data.userName}'s ToDo.`
            else 
            data['message']=`A new list "${data.listName}" has been created by its owner "${data.userName}".`;
            
            socket.to(data.userId).broadcast.emit('onChanges-inList',(data))
            data['message']='New list has been created successfully.'
            socket.emit('onChanges-inList',(data)) 

        }); //end of create and save new-list
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "create-list" Create List
         * @apiDescription Creates a new list and emits changes to uesrs, on updating databases.
         * 
         * @apiParam {string} userId user's uesrId. (required)
         * @apiParam {string} listName Name of the List. (required)
         * @apiParam {string} userName user's Name. (required)
         *  @apiParam {string} friendId friend's userId who is creating a list in others ToDo. (optional)
         * @apiParam {string} friendName friend's Name who is creating a list in others ToDo. (optional)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "userId":"tw-syQJJ9",
                  "userName":"User11 L11",
                  "friendId":'Y_nchyDcv",
                  "friendName":"user103 S",
                  "listId":"Em2eTY_aV",
                  "listName":"Sample List",
                  "items":[{
                      "itemName":"sample Item",
                      "itemId":"TPA0_9sC2",
                      "open":true,
                      "subitems":[]
                    }
                  ]
                  "action":"create",
                  "message":"New list has been created successfully."
                }
            ]
        */
        socket.on('delete-list',(data)=>{
            data['action']='delete';
            eventEmitter.emit('delete-list',(data));
            eventEmitter.emit('update-user-model',(data));

            if(!check.isEmpty(data['friendName']))         
                data['message']=`${data.friendName} has dropped a list in ${data.userName}'s ToDo.`
            else
            data['message']=`A list "${data.listName}" was dropped by its owner "${data.userName}".`                
                
            socket.to(data.userId).broadcast.emit('onChanges-inList',(data))
            data['message']='List has been dropped successfully.'
            socket.emit('onChanges-inList',(data))

        }) //end of delete list
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "delete-list" Delete List
         * @apiDescription Deletes any list and emits changes to uesrs, on updating databases.
         * 
         * @apiParam {string} userId user's uesrId. (required)
         * @apiParam {string} listName Name of the List. (required)
         * @apiParam {string} userName user's Name. (required)
         *  @apiParam {string} friendId friend's userId who is deleting the list in others ToDo. (optional)
         * @apiParam {string} friendName friend's Name who is deleting the list in others ToDo. (optional)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "userId":"tw-syQJJ9",
                  "userName":"User11 L11",
                  "friendId":'Y_nchyDcv",
                  "friendName":"user103 S",
                  "listId":"Em2eTY_aV",
                  "listName":"Sample List",
                  "action":""delete",
                  "message":"List has been dropped successfully"
                }
            ]
        */

        socket.on('increase-element',(data)=>{
            let element={};
            if(data['action']=='new item'){
                element={
                    'itemId':shortid.generate(),
                    'itemName':'New Item',
                    'open':true,
                    'subitems':[]
                    };
            }else if(data['action']=='new subitem'){
                element={
                    'subitemId':shortid.generate(),
                    'subitemName':'New Sub Item',
                    'open':true,
                };
            }
            data['element']=element;
            eventEmitter.emit('add-in-list',(data));
            eventEmitter.emit('set-operation',(data)); //already set action new item/subitem
            
            //message for users
            if(!check.isEmpty(data['friendName']))        
                data['message']=`${data.friendName} has raised an element under "${data.listName}" in ${data.userName}'s ToDo.`                
            else {
                data['message']=`A new elment was raised under "${data['listName']}" by its owner "${data.userName}".`
            }   
            socket.to(data.userId).broadcast.emit('onChanges-inList',(data))
            data['message']=`A new element was raised under "${data['listName']}" successfully.`
            socket.emit('onChanges-inList',(data))

        }) //end adding new element in the list
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "increase-element" Increase an Element
         * @apiDescription Creates a new element in the list and emits changes to uesrs, on updating databases.
         * 
         * @apiParam {string} userId user's uesrId. (required)         
         * @apiParam {string} listId List's Id. (required)
         * @apiParam {string} listName Name of the List. (required)
         * @apiParam {string} userName user's Name. (required)
         *  @apiParam {string} friendId friend's userId who is creating a list in others ToDo. (optional)
         * @apiParam {string} friendName friend's Name who is creating a list in others ToDo. (optional)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "userId":"tw-syQJJ9",
                  "userName":"User11 L11",
                  "friendId":'Y_nchyDcv",
                  "friendName":"user103 S",
                  "listId":"Em2eTY_aV",
                  "listName":"Sample List",
                  "items":[{
                      "itemName":"New Item",
                      "itemId":"TPA0_9sC2",
                      "open":true,
                      "subitems":[]
                    }
                  ]
                  "action":"new item",
                  "message":"A new element was raised under "Sample List" successfully."
                }
            ]
        */
        socket.on('decrease-element',(data)=>{
            eventEmitter.emit('delete-from-list',(data));

            //setting message for user
            if(!check.isEmpty(data['friendName']))          
            data['message']=`${data.friendName} has dropped an element under ${data.listName} in ${data.userName}'s ToDo.`                
            else 
            data['message']=`An element was dropped under "${data['listName']}" by its ownner "${data.userName}".`
            
            socket.to(data.userId).broadcast.emit('onChanges-inList',(data))
            data['message']=`An element was dropped under "${data['listName']}" successfully.`
            socket.emit('onChanges-inList',(data))
                
        })//end removing an element from list or item
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "decrease-element" Decrease an Element 
         * @apiDescription Deletes any element in the list and emits changes to uesrs, on updating databases.
         * 
         * @apiParam {string} userId user's uesrId. (required)         
         * @apiParam {string} listId List's Id. (required)
         * @apiParam {string} listName Name of the List. (required)
         * @apiParam {string} userName user's Name. (required)
         * @apiParam {string} itemId Item's Id. (required)
         * @apiParam {string} itemName Name of the Item. (required)
         *  @apiParam {string} friendId friend's userId who is creating a list in others ToDo. (optional)
         * @apiParam {string} friendName friend's Name who is creating a list in others ToDo. (optional)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "userId":"tw-syQJJ9",
                  "userName":"User11 L11",
                  "friendId":'Y_nchyDcv",
                  "friendName":"user103 S",
                  "listId":"Em2eTY_aV",
                  "listName":"Sample List",
                  "itemName":"New Item",
                  "itemId":"TPA0_9sC2",
                  "action":"delete item",
                  "message":"A new element was dropped under "Sample List" successfully."
                }
            ]
        */
        socket.on('list-change',(data)=>{
            data['action']='update';
            eventEmitter.emit('update-list-model',(data));

            if(!check.isEmpty(data['friendName']))        
                data['message']=`${data.friendName} has made changes to "${data.listName}" in ${data.userName}'s ToDo.`
                
            else 
                data['message']=`Changes to "${data['listName']}" were made by its owner successfully.`
            
            socket.to(data.userId).broadcast.emit('onChanges-inList',(data))
            data['message']=`Changes were made successfully to "${data['listName']}".`
            socket.emit('onChanges-inList',(data))
        }) //any changes inside list
        /**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "list-change" Edit List 
         * @apiDescription Changes names and states of items,subitems and list, emits changes to uesrs, on updating databases.
         * 
         * @apiParam {string} userId user's uesrId. (required)         
         * @apiParam {string} listId List's Id. (required)
         * @apiParam {string} listName Name of the List. (required)
         * @apiParam {string} userName user's Name. (required)
         * @apiParam {string} itemId Item's Id. (required)
         * @apiParam {string} itemOpen State of the Item. (required)
         *  @apiParam {string} friendId friend's userId who is creating a list in others ToDo. (optional)
         * @apiParam {string} friendName friend's Name who is creating a list in others ToDo. (optional)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "userId":"tw-syQJJ9",
                  "userName":"User11 L11",
                  "friendId":'Y_nchyDcv",
                  "friendName":"user103 S",
                  "listId":"Em2eTY_aV",
                  "listName":"Sample List",
                  "itemOpen":false,
                  "itemId":"TPA0_9sC2",
                  "action":"update",
                  "message":"Changes were made successfully to "Sample List"."
                }
            ]
        */
        socket.on('last-change-on-list',(data)=>{ 
            if(data.action=='userList'){
                redisLib.getListsInUser(data,(err,res)=>{
                    if(!check.isEmpty(res)){
                        let lastList=JSON.parse(res);
                        if(lastList.action=='create'){
                            eventEmitter.emit('delete-list',(lastList));
                            lastList.action='delete';
                            
                        }else if (data.action=='delete'){
                            eventEmitter.emit('save-list', lastList);
                            lastList.action='create';
                        }

                        if(!check.isEmpty(data['friendName']))        
                            lastList['message']=`${data.friendName} has restored restored a previous state of lists in ${data.userName}'s ToDo.`
                        else    
                        lastList['message']=`A previous state to lists was restored by its owner "${data.userName}" successfully.`
                            
                        socket.to(data.userId).broadcast.emit('onChanges-inList',(lastList))
                        lastList['message']=`Lists were restored to a previous state successfully.`
                        socket.emit('onChanges-inList',(lastList))
                    } else{ 
                        data['message']='No more Operations to Undo.';
                        socket.emit('onChanges-inList',(data));
                    } 
                })
            }
            else{
                redisLib.getLastOperation(data,(err,res)=>{
                    if( res!=null && res.action!='create'){
                    let data=JSON.parse(res);    
                    //reversing actions 
                    if(data['action']=='new item'){data['action']='remove item';}
                    else if(data['action']=='new subitem'){data['action']='remove subitem';}
                    else if(data['action']=='delete item')data['action']='add item';
                    else if(data['action']=='delete subitem')data['action']='add subitem';
                    else if(data['action']=='update')data['action']='revert';

                    //sending data according to actions
                    if(data['action']=='remove item'|| data['action']=='remove subitem'){
                        eventEmitter.emit('delete-from-list',(data));
                    } else if(data['action']=='add item'|| data['action']=='add subitem'){
                        eventEmitter.emit('add-in-list',(data));
                    } else if(data['action']=='revert'){
                        eventEmitter.emit('update-list-model',(data));
                    }
                    if(!check.isEmpty(data['friendName']))         
                        data['message']=`${data.friendName} has restored a previous state of "${data.listName}" in ${data.userName}'s ToDo.`
                    else
                        data['message']=`A previous state of "${data.listName}" was restored by its owner "${data.userName}" successfully.`
                         
                    socket.to(data.userId).broadcast.emit('onChanges-inList',(data))
                    data['message']=`List "${data.lisName}" was restored to a previous state successfully.`
                    socket.emit('onChanges-inList',(data))
                    }
                    else{ 
                        data['message']='No more Operations to Undo.';
                        socket.emit('onChanges-inList',(data));
                    }                                
                })
            }
        }) //On Undo action of lists or items.

    });

}

/**
         * @apiGroup Listener
         * @apiVersion  1.0.0
         * @api {on} "last-change-on-list" Undo  
         * @apiDescription Undo any Changes made to names and states of items,subitems and list, creates & deletes on a list/s & emits changes to uesrs, on updating databases.
         * 
         * @apiParam {string} userId user's uesrId. (required)         
         * @apiParam {string} listId List's Id. (required)
         * @apiParam {string} listName Name of the List. (required)
         * @apiParam {string} userName user's Name. (required)
         * @apiParam {string} itemId Item's Id. (required)
         * @apiParam {string} itemOpen State of the Item. (required)
         *  @apiParam {string} friendId friend's userId who is creating a list in others ToDo. (optional)
         * @apiParam {string} friendName friend's Name who is creating a list in others ToDo. (optional)
         * @apiSuccess {object} myResponse shows error status, message, http status code, result.
         * 
         * @apiSuccessExample {object} Success-Response:
           [
                { "userId":"tw-syQJJ9",
                  "userName":"User11 L11",
                  "listId":"Em2eTY_aV",
                  "listName":"Sample List",
                  "itemOpen":false,
                  "itemId":"TPA0_9sC2",
                  "action":"revert",
                  "message":"List  "Sample List" was restored to a previous state successfully."
                }
            ]
        */
// database operations are kept outside of socket.io code.

/**
 * USER RELATED EVENTS
 */

eventEmitter.on('accept-friend-request',(data)=>{
    RequestModel.findOneAndUpdate({senderId:data.senderId,receiverId:data.receiverId},{active:false,modifiedOn:Date.now()}).exec((err,result)=>{
            if(err)
            logger.error(err+'db error occurred','socketLib:event:accept-friend-request()',1)
            else if(check.isEmpty(result))
            logger.error('Could not accept request.Empty found.','socketLib:event:accept-friend-request()',1)
            else 
            logger.info('Friend Request accepted Successfully','socketLib:event:accept-friend-request()',1)
    })
    UserModel.findOneAndUpdate({userId:data.senderId},{$push:{friends:data.receiverId}},{upsert:true}).exec((err,result)=>{
        if(err)
        logger.error(err+'db error occurred','socketLib:event:accept-friend-request()',1)
        else if(check.isEmpty(result))
        logger.error('Could not update sender.Empty found.','socketLib:event:accept-friend-request()',1)
        else
        logger.info('Sender updated Successfully','socketLib:event:accept-friend-request()',1)
        
    })
    UserModel.findOneAndUpdate({userId:data.receiverId},{$push:{friends:data.senderId}},{upsert:true}).exec((err,result)=>{
        if(err)
        logger.error(err+'db error occurred','socketLib:event:accept-friend-request()',1)
        else if(check.isEmpty(result))
        logger.error('Could not save receiver.Empty found.','socketLib:event:accept-friend-request()',1)
        else 
        logger.info('Receiver updated Successfully','socketLib:event:accept-friend-request()',10)
    })
})

eventEmitter.on('decline-friend-request',(data)=>{
    RequestModel.findOneAndUpdate({senderId:data.senderId,receiverId:data.receiverId},
        {active:false,modifiedOn:Date.now()}).exec((err,result)=>{
            if(err)
            logger.error(err+'db error occurred','socketLib:event:decline-friend-request()',1)
            else if(check.isEmpty(result))
            logger.error('Could not decline request.Empty found.','socketLib:event:decline-friend-request()',1)
            else 
            logger.info('Friend Request declined Successfully','socketLib:event:decline-friend-request()',1)
    })
})

eventEmitter.on('send-friend-request',(data)=>{
    RequestModel.findOne({senderId:data.senderId,receiverId:data.receiverId}).exec((err,result)=>{
        if(err)
        logger.error(err+'db error occurred','socketLib:event:send-friend-request()',1)
        else if(check.isEmpty(result)){
            logger.info('No request Exists','socketLib:event:send-friend-request()',1)
            let newRequest= new RequestModel(data)
            newRequest.save((err,newResult)=>{
                if(err)
                logger.error(err+'db error occurred','socketLib:event:send-friend-request()',1)
                else if(check.isEmpty(newResult))
                logger.error('Could not generate new request','socketLib:event:send-friend-request()',1)
                else 
                logger.info('Friend Request generated Successfully','socketLib:event:send-friend-request()',1)
            })
        }
        else{
            result.modifiedOn=Date.now();
            result.active=true;
            result.save((err,newResult)=>{
                if(err)
                logger.error(err+'db error occurred','socketLib:event:send-friend-request()',1)
                else if(check.isEmpty(newResult))
                logger.error('Could not save request','socketLib:event:send-friend-request()',1)
                else 
                logger.info('Friend Request saved Successfully','socketLib:event:send-friend-request()',1)
            })
        }
    })
})

eventEmitter.on('cancel-friend-request',(data)=>{
    RequestModel.findOneAndUpdate({senderId:data.senderId,receiverId:data.receiverId},
    {active:false,modifiedOn:Date.now()}).exec((err,result)=>{
        if(err)
        logger.error(err+'db error occurred','socketLib:event:cancel-friend-request()',1)
        else if(check.isEmpty(result))
        logger.error('Could not cancel request.Empty found.','socketLib:event:cancel-friend-request()',1)
        else 
        logger.info('Friend Request Cancelled Successfully','socketLib:event:cancel-friend-request()',1)
    })
})

eventEmitter.on('unfriend',(data)=>{
    UserModel.updateOne({userId:data.userId},{$pull:{friends:data.senderId}},(err,res)=>{
        if(err)
        logger.error(err+'db error occurred','socketLib:event:remove-friend()',1)
        else if(check.isEmpty(res))
        logger.error('Could not remove friend. Found empty.','socketLib:event:remove-friend()',1)
        else 
        logger.info('Friend has been removed Successfully','socketLib:event:remove-friend()',1)
    })
    UserModel.updateOne({userId:data.senderId},{$pull:{friends:data.userId}},(err,res)=>{
        if(err)
        logger.error(err+'db error occurred','socketLib:event:remove-friend()',1)
        else if(check.isEmpty(res))
        logger.error('Could not remove friend. Found empty.','socketLib:event:remove-friend()',1)
        else 
        logger.info('Friend has been removed Successfully','socketLib:event:remove-friend()',1)
    })
})

/**
 * LIST RELATED EVENTS
 */

// saving new List Model.
eventEmitter.on('save-list', (data) => {

    let newList = new ListModel({
        userId:data.userId,
        userName:data.userName,
        listId: data.listId,
        listName: data.listName,
        items:data.items,
        createdOn: Date.now(),
        modifiedOn:Date.now()
    });

    newList.save((err,result) => {
        if(err){
            logger.error(err+'db error occurred','socketLib:event save-list',1)
        }
        else if(result == undefined || result == null || result == ""){
            logger.error('Undedfined List. List was not saved','socketLib:event save-list',1)
        }
        else {
            logger.info('success! List was saved','socketLib:event save-list',1)
        }
    });

}); // end of saving new List Model.

eventEmitter.on('delete-list',(data)=>{
    ListModel.findOneAndRemove({listId:data.listId},(err,res)=>{
        if(err)
        logger.error('error occurred while deleting list model','socketLib:event delete-list',1)
        else if(check.isEmpty(res))
        logger.error('empty list model while finding list model ','socketLib:event delete-list',1)
        else{
        logger.info('success','socketLib:event : delete-list',10);
            res['action']='delete';            
            eventEmitter.emit('set-operation',(res));            
        }
    })
});//end delete list model

eventEmitter.on('add-in-list',(data)=>{
    if(data.action=='new item' || data.action=='add item'){         
        ListModel.findOne({listId:data.listId}).exec((err,result)=>{
            if(err)
            logger.error('error occurred while finding list model','socketLib:event add-in-list',1)
            else if(check.isEmpty(result))
            logger.error('empty list model while finding list model ','socketLib:event add-in-list',1)
            else{
                result.items.set(result.items.length,data.element);
                result.save((err,newResult)=>{
                    if(err)
                    logger.error('error occurred while adding new item to list model'+err,'socketLib:event add-in-list',1)
                    else if(check.isEmpty(newResult))
                    logger.error('empty list of items  while adding new item to list model ','socketLib:event add-in-list',1)
                    else
                    logger.info('Successfully added new item','socketLib:event add-in-list',1)
                })
            }
        })
            
        
    }else if(data.action=='new subitem' || 'add subitem'){

        ListModel.findOne({listId:data.listId}, { items: { $elemMatch: { itemId : data.itemId }}})
        .exec((err,result)=>{
            if(err)
            logger.error('error occurred while finding list model','socketLib:event add-in-list',1)
            else if(check.isEmpty(result))
            logger.error('empty list model while finding list model ','socketLib:event add-in-list',1)
            else{
                for(let item in result.items){
                    for(let subitems in result.items[item])
                    {
                        if(subitems=='subitems'){
                            result.items[item].subitems.set(result.items[item].subitems.length,data.element)
                        }
                    }
                }
                result.save((err,newResult)=>{
                    if(err)
                    logger.error('error occurred while adding new subitem to list model'+err,'socketLib:event add-in-list',1)
                    else if(check.isEmpty(newResult))
                    logger.error('empty list of items  while adding new subitem to list model ','socketLib:event add-in-list',1)
                    else
                    logger.info('Successfully added new subitem','socketLib:event add-in-list',1)
                })
            } 
        })
    }
}) //end adding new item to the list

eventEmitter.on('delete-from-list',(data)=>{
    if(data.action=='delete item' || data.action=='remove item'){
        ListModel.findOne({listId:data.listId},(err,result)=>{
            if(err)
            logger.error('error occurred while finding list model','socketLib:event delete-from-list',1)
            else if(check.isEmpty(result))
            logger.error('empty list model while finding list model ','socketLib:event delete-from-list',1)
            else{
                let removeIndex;
                if(data.action=='remove item'){
                    removeIndex=result.items.map(function(item){return item.itemId}).indexOf(data.element.itemId)
                }
                else{
                    removeIndex=result.items.map(function(item){return item.itemId}).indexOf(data.itemId)
                    data['element']=result.items[removeIndex]; //adding operation to hash before splicing
                    eventEmitter.emit('set-operation',(data));
                }
                result.items.splice(removeIndex,1);
                result.save((err,newResult)=>{
                    if(err)
                    logger.error('error occurred while removing item to list model','socketLib:event delete-from-list',1)
                    else if(check.isEmpty(newResult))
                    logger.error('empty list of items while removing item to list model ','socketLib:event delete-from-list',1)
                    else
                    logger.info('Successfully removed item','socketLib:event delete-from-list',1)
                })
            }
        })
    }else if(data['action']=='delete subitem'|| data['action']=='remove subitem'){
        if(data['action']=='remove subitem'){
            data['itemId']=data.element.itemId;             //doing to make previous query paramaters usable 
            data['subitemId']=data.element.subitemId;
        }
        ListModel.findOne({listId:data.listId}, { items: { $elemMatch: { itemId : data.itemId }}})
        .exec((err,result)=>{
            if(err)
            logger.error('error occurred while finding list model','socketLib:event delete-from-list',1)
            else if(check.isEmpty(result))
            logger.error('empty list model while finding list model ','socketLib:event delere-from-list',1)
            else{
                for(let item of result.items){
                    if(item.itemId==data.itemId){
                       let removeIndex=item.subitems.map(function(subitem){return subitem.subitemId}).indexOf(data.subitemId);
                       if(data.action != 'remove subitem'){
                            data['element']=result.items[removeIndex]; //adding operation to hash before splicing
                            eventEmitter.emit('set-operation',(data));
                       }
                       item.subitems.splice(removeIndex,1)
                    }
                }
                result.save((err,newResult)=>{
                    if(err)
                    logger.error('error occurred while adding new subitem to list model','socketLib:event add-in-list',1)
                    else if(check.isEmpty(newResult))
                    logger.error('empty list of items  while adding new subitem to list model ','socketLib:event add-in-list',1)
                    else
                    logger.info('Successfully added new subitem','socketLib:event add-in-list',1)
                })
            } 
        })
    }
}) //end adding new item to the list

//saving User Model
eventEmitter.on('update-user-model',(data)=>{
    if(data['action']=='delete'){
        UserModel.findOneAndUpdate({userId:data.userId},{$pull:{lists:data.listId}})
        .exec((err,result)=>{
            if(err){
                logger.error(err+'db error occurred','socketLib:event update-user-model',1)
            }
            else if(result == undefined || result == null || result == ""){
                logger.error('Undedfined User or Empty User','socketLib:event update-user-model',1)
            }
            else {
                logger.info('success List was removed from User Model','socketLib:event update-user-model',1)
            }
        })
    }else{
        UserModel.findOneAndUpdate({userId:data.userId},{$push:{lists:data.listId}})
        .exec((err,result)=>{
            if(err){
                logger.error(err,'socketLib:event update-user-model',1)
            }
            else if(result == undefined || result == null || result == ""){
                logger.error('Undedfined User or Empty User List was not saved to user Model','socketLib:event update-user-model',1)
            }
            else {
                logger.info('success List was saved to User Model','socketLib:event update-user-model',1)
            }
        })
    }
}) //end

//add list change in hash
eventEmitter.on('set-operation',(data)=>{
    redisLib.addListChangeInHash(data,(err,res)=>{
        if(err){
            logger.error(err,'socketLib:event set-operation',3)
        }else{
            logger.info('Operation Recorded Successfully','socketLib:event set-operation',3)
        }
    })
}) //end

//updating list Model 
eventEmitter.on('update-list-model',(data)=>{
    if(check.isEmpty(data.itemId) && check.isEmpty(data.subitemId)){
        ListModel.findOne({listId:data.listId},(err,result)=>{
            if(err)
            logger.error(err+'event emitter find List','socketLib:event:update-list-model',1)
            else if(check.isEmpty(result))
            logger.error('List is empty','socketLib:event:update-list-model',1)
            else{
                if(data.action=='update'){
                    let newData={
                        'userId':data.userId,
                        'userName':data.userName,
                        'listId':result.listId,
                        'listName':result.listName,
                        'action':'update'
                    }
                    eventEmitter.emit('set-operation',(newData));
                }result['listName']=data.listName;
                result.save((err,res)=>{
                    if(err)
                    logger.error(err+'event emitter updating list name','socketLib:event:update-list-model',1)
                    else if(check.isEmpty(res))
                    logger.error('list was saved empty','socketLib:event:update-list-model',1)
                    else
                    logger.info('success in updating list name','socketLib:event:update-list-model',1)
                })
            }
        })
    }else {
        ListModel.findOne({listId:data.listId}, { items: { $elemMatch: { itemId : data.itemId }}})
        .exec((err,result)=>{
            if(err)
            logger.error(err+'db error occurred','socketLib:event:update-list-model',1)
            else if(result == undefined || result == null || result == "")
            logger.error('Empty List was found','socketLib:event:update-list-model',1)
            else {
                let newData={
                    'userId':data.userId,
                    'userName':data.userName,
                    'listId':data.listId,
                    'listName':data.listName,
                    'action':'update'
                };
                for (let item of result.items){
                    newData['itemId']=item.itemId;                  
                    if(check.isEmpty(data.subitemId)){
                        if(!check.isEmpty(data.itemName)){
                            newData['itemName']=item.itemName;
                            item.itemName=data.itemName;
                        }
                        if(!check.isEmpty(data.itemOpen)){
                            newData['itemOpen']=item.open;
                            item.open=data.itemOpen;
                        }
                    }
                    else{ 
                        for (let subitem of item.subitems){
                            if(subitem.subitemId==data.subitemId){
                                newData['subitemId']=subitem.subitemId;
                                if(!check.isEmpty(data.subitemName)){                                    
                                    newData['subitemName']=subitem.subitemName;
                                    subitem.subitemName=data.subitemName;
                                }
                                if(!check.isEmpty(data.subitemOpen)){
                                    newData['subitemOpen']=subitem.open;
                                    subitem.open=data.subitemOpen;
                                }
                            }
                        }
                    }
                }   
                if(data.action!='revert')eventEmitter.emit('set-operation',(newData));
                result.save((err,newResult)=>{
                    if(!err){
                    logger.info('list updated successfully','socketLib:event:update-list-model',1)
                    }else {
                    logger.error('list was not updated','socketLib:event update-list-model',1)
                    }
                })               
            }
        })

    }    
})//end


module.exports = {
    setServer: setServer
}
